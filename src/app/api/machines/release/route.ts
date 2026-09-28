import { NextResponse } from "next/server";
import { isAdminConfigured, getAdminDb } from "@/lib/admin";
import { hashClaimSecret } from "@/lib/claimHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_MACHINE = {
  status: "available",
  finishTime: null,
  cycleMinutes: null,
  cycleMode: null,
  almostAt: null,
  almostAlertSent: false,
  finishAlertSent: false,
  ownerUid: null,
  ownerName: null,
  ownerPhone: null,
  ticketNumber: null,
  reservedUntil: null,
  claimHash: null,
  maintenanceNote: null,
};

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "FIREBASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as {
    machineId?: unknown;
    secret?: unknown;
    action?: unknown;
  } | null;
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  const secret = typeof body?.secret === "string" ? body.secret : "";
  const action = body?.action === "cancel" ? "cancel" : body?.action === "collect" ? "collect" : "";
  if (!machineId || !secret.trim() || !action) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const expected = hashClaimSecret(secret);
  const db = getAdminDb();
  const ref = db.collection("machines").doc(machineId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MACHINE_NOT_FOUND");
      const data = snap.data() ?? {};
      if (data.claimHash !== expected) throw new Error("BAD_CODE");
      const status = String(data.status ?? "");
      if (action === "collect" && status !== "finished") throw new Error("NOT_FINISHED");
      if (action === "cancel" && status !== "in_use") throw new Error("NOT_IN_USE");
      tx.update(ref, FREE_MACHINE);
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "RELEASE_FAILED";
    const status = code === "BAD_CODE" || code === "NOT_FINISHED" || code === "NOT_IN_USE" ? 403 : 404;
    return NextResponse.json({ error: code }, { status });
  }
  return NextResponse.json({ ok: true });
}
