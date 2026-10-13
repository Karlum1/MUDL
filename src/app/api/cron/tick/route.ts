import { NextResponse } from "next/server";
import { runLaundryTick } from "@/lib/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  if (process.env.NODE_ENV === "development" && !process.env.CRON_SECRET) {
    return true;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const result = await runLaundryTick();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "TICK_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
