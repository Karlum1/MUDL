const STORAGE_KEY = "wm-claim-codes-v1";

export type SavedClaim = {
  machineId: string;
  secret: string;
  phone: string;
  startedAt: number;
};

export function createClaimSecret() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashClaimSecret(secret: string) {
  const data = new TextEncoder().encode(secret.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readAll(): SavedClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedClaim[]) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.machineId && item?.secret) : [];
  } catch {
    return [];
  }
}

function writeAll(items: SavedClaim[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    /* quota */
  }
}

export function saveClaim(claim: SavedClaim) {
  const rest = readAll().filter((item) => item.machineId !== claim.machineId);
  writeAll([claim, ...rest]);
}

export function readClaim(machineId: string) {
  return readAll().find((item) => item.machineId === machineId) ?? null;
}

export function readClaims() {
  return readAll();
}

export function forgetClaim(machineId: string) {
  writeAll(readAll().filter((item) => item.machineId !== machineId));
}
