import type { Machine, MachineStatus } from "@/lib/types";

export const STATUS_COPY: Record<
  MachineStatus,
  { th: string; en: string; badge: string; glow: string }
> = {
  available: {
    th: "เครื่องว่าง",
    en: "Available",
    badge: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30",
    glow: "shadow-[0_0_24px_-8px_rgba(52,211,153,0.55)]",
  },
  reserved: {
    th: "จองคิวแล้ว",
    en: "Reserved",
    badge: "bg-violet-400/15 text-violet-200 ring-1 ring-violet-400/30",
    glow: "shadow-[0_0_24px_-8px_rgba(167,139,250,0.45)]",
  },
  in_use: {
    th: "กำลังใช้งาน / เต็ม",
    en: "In Use / Full",
    badge: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/30",
    glow: "shadow-[0_0_24px_-8px_rgba(56,189,248,0.45)]",
  },
  finished: {
    th: "ใช้งานเสร็จแล้วแต่ยังไม่เอาผ้าออก",
    en: "Finished (clothes not collected)",
    badge: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/35",
    glow: "shadow-[0_0_24px_-8px_rgba(251,191,36,0.5)]",
  },
};

export function remainingLabel(machine: Machine, now = Date.now()) {
  const endsAt = machine.finishTime ?? machine.cycleEndsAt;
  if (machine.status !== "in_use" || !endsAt) return null;
  return Math.max(0, endsAt - now);
}
