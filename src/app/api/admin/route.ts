import { NextResponse } from "next/server";
import { adminPinConfigured, adminPinMatches } from "@/lib/adminPin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    pinConfigured: adminPinConfigured(),
  });
}

export async function POST(request: Request) {
  let body: {
    pin?: string;
    action?: string;
    machineId?: string;
    ticketId?: string;
    note?: string;
    messageTh?: string;
    push?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!adminPinConfigured()) {
    return NextResponse.json({ error: "ADMIN_PIN_NOT_SET" }, { status: 503 });
  }
  if (!adminPinMatches(body.pin)) {
    return NextResponse.json({ error: "ADMIN_PIN_REQUIRED" }, { status: 401 });
  }
  if (!body.action) {
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  }
  if (body.action === "session") {
    return NextResponse.json({ ok: true });
  }

  try {
    const { runAdminCommand } = await import("@/lib/adminCommands");
    const result = await runAdminCommand({
      action: body.action,
      machineId: body.machineId,
      ticketId: body.ticketId,
      note: body.note,
      messageTh: body.messageTh,
      push: Boolean(body.push),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_FAILED";
    const status = message === "FIREBASE_ADMIN_NOT_CONFIGURED" ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
