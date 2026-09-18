import { NextResponse } from "next/server";
import { dispatchNext } from "@/lib/tick";
import { isAdminConfigured } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, reason: "FIREBASE_ADMIN_NOT_CONFIGURED" });
  }
  const result = await dispatchNext();
  return NextResponse.json(result);
}
