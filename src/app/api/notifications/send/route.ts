import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/admin";
import { deliverFinishAlert } from "@/lib/finishAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, reason: "FIREBASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    machineId?: unknown;
    ownerUid?: unknown;
    finishTime?: unknown;
  } | null;
  const machineId = typeof body?.machineId === "string" ? body.machineId : "";
  const ownerUid = typeof body?.ownerUid === "string" ? body.ownerUid : "";
  const finishTime = typeof body?.finishTime === "number" ? body.finishTime : 0;
  if (!machineId || !ownerUid || !finishTime) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  if (Date.now() + 15_000 < finishTime) {
    return NextResponse.json({ error: "TOO_EARLY" }, { status: 500 });
  }

  const sent = await deliverFinishAlert(machineId, { ownerUid, finishTime });
  return NextResponse.json({ ok: true, sent });
}
