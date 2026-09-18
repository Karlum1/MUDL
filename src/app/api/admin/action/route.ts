import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/admin";
import { isAdminSession } from "@/lib/admin-session";
import {
  adminCancelTicket,
  adminDispatch,
  adminReleaseMachine,
  adminResetTodayQueue,
  adminSetBroken,
} from "@/lib/admin-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "FIREBASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json()) as {
    action?: string;
    machineId?: string;
    ticketId?: string;
  };

  try {
    if (body.action === "release" && body.machineId) {
      await adminReleaseMachine(body.machineId);
    } else if (body.action === "break" && body.machineId) {
      await adminSetBroken(body.machineId, true);
    } else if (body.action === "repair" && body.machineId) {
      await adminSetBroken(body.machineId, false);
    } else if (body.action === "cancelTicket" && body.ticketId) {
      await adminCancelTicket(body.ticketId);
    } else if (body.action === "resetToday") {
      await adminResetTodayQueue();
    } else if (body.action === "dispatch") {
      await adminDispatch();
    } else {
      return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
