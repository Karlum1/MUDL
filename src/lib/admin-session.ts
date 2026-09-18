import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "wm_admin";

function tokenFor(password: string) {
  return createHmac("sha256", password).update("dorm-admin-session").digest("hex");
}

export function adminPasswordConfigured() {
  return Boolean(process.env.DORM_ADMIN_PASSWORD);
}

export function checkAdminPassword(password: string) {
  const expected = process.env.DORM_ADMIN_PASSWORD ?? "";
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminSession() {
  const password = process.env.DORM_ADMIN_PASSWORD;
  if (!password) return false;
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return false;
  const expected = tokenFor(password);
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setAdminSession() {
  const password = process.env.DORM_ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD_MISSING");
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
