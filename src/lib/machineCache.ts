import type { Machine } from "@/lib/types";

const CACHE_KEY = "wm-machines-cache-v1";

export function writeMachineCache(machines: Machine[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), machines }));
  } catch {
    /* quota */
  }
}

export function readMachineCache(): Machine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { machines?: Machine[] };
    return Array.isArray(parsed.machines) ? parsed.machines : [];
  } catch {
    return [];
  }
}
