import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/admin";
import { sendPushToUid } from "@/lib/pushCleanup";

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
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  let uid = "";
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { machineId?: unknown } | null;
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  if (!machineId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const db = getAdminDb();
  const ref = db.collection("machines").doc(machineId);
  let notify: { uid: string; label: string } | null = null;
  try {
    notify = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MACHINE_NOT_FOUND");
      const data = snap.data() ?? {};
      const status = String(data.status ?? "");
      const finishMs = data.finishTime?.toMillis?.() as number | undefined;
      const timeUp = typeof finishMs === "number" && finishMs <= Date.now();
      if (status !== "finished" && !(status === "in_use" && timeUp)) {
        throw new Error("NOT_FINISHED");
      }
      const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : "";
      const label = String(data.label ?? machineId);
      tx.update(ref, FREE_MACHINE);
      if (ownerUid && ownerUid !== uid) return { uid: ownerUid, label };
      return null;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "RELEASE_FAILED";
    const status = code === "NOT_FINISHED" ? 403 : 404;
    return NextResponse.json({ error: code }, { status });
  }

  if (notify) {
    try {
      await sendPushToUid(
        notify.uid,
        "มีคนเอาผ้าออกให้แล้ว",
        `${notify.label} มีคนเอาผ้าออกให้คุณแล้วนะครับ`,
        `${machineId}-collected`,
      );
    } catch (error) {
      console.error("collect push failed", machineId, error);
    }
  }
  return NextResponse.json({ ok: true });
}
