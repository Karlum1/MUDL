import { NextResponse } from "next/server";
import {
  adminPasswordConfigured,
  checkAdminPassword,
  isAdminSession,
  setAdminSession,
} from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: await isAdminSession(),
    configured: adminPasswordConfigured(),
  });
}

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD_MISSING" }, { status: 503 });
  }
  const body = (await request.json()) as { password?: string };
  if (!checkAdminPassword(body.password ?? "")) {
    return NextResponse.json({ error: "BAD_PASSWORD" }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
