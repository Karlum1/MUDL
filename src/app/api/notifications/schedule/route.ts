import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/admin";
import { scheduleFinishPush } from "@/lib/scheduleFinish";
import { verifyFirebaseIdToken } from "@/lib/verifyIdToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, reason: "FIREBASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!idToken) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let uid = "";
  try {
    uid = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { machineId?: unknown } | null;
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  if (!machineId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const snap = await getAdminDb().collection("machines").doc(machineId).get();
  const data = snap.data();
  const finishTime = data?.finishTime?.toMillis?.() as number | undefined;
  if (!data || data.status !== "in_use" || data.ownerUid !== uid || !finishTime) {
    return NextResponse.json({ ok: false, reason: "NOT_ACTIVE" }, { status: 409 });
  }

  const scheduled = await scheduleFinishPush({
    machineId,
    ownerUid: uid,
    finishTime,
  });
  return NextResponse.json({ ok: true, ...scheduled });
}
