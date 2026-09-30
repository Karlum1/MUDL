import { bangkokClockLabel } from "@/lib/day";
import type { Locale } from "@/lib/i18n";

export type DormId = "sri" | "lee" | "int" | "chai" | "kan";
export type MachineKind = "washer" | "dryer" | "combo";
export type MachineLook = "white" | "combo" | "black" | "grey" | "dryer";

export type Dorm = {
  id: DormId;
  name: string;
  halls: string;
};

export const DORMS: Dorm[] = [
  { id: "sri", name: "บ้านศรีตรัง", halls: "หอ 11" },
  { id: "lee", name: "บ้านลีลาวดี", halls: "หอ 10" },
  { id: "int", name: "บ้านอินทนิล", halls: "หอ 3–4" },
  { id: "chai", name: "บ้านชัยพฤกษ์", halls: "หอ 6–7" },
  { id: "kan", name: "บ้านกันภัยมหิดล", halls: "หอ 8–9" },
];

/** หน้าหลักและจอสถานะโชว์เฉพาะหอเหล่านี้ — คืน `[]` แล้วเอา LaundryFilter กลับ ถ้าจะโชว์ทุกหอ */
export const PUBLIC_DORM_IDS: DormId[] = ["int"];

export type SeedMachine = {
  id: string;
  label: string;
  floor: number;
  dormId: DormId;
  kind: MachineKind;
  look: MachineLook;
  number: number;
};

export const MACHINE_ID_RE = /^(wm-\d{2}|(int|chai|kan|lee|sri)-(wm|dr)-\d{2})$/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function seq(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function labelFor(look: MachineLook, n: number) {
  if (look === "dryer") return `เครื่องอบผ้า ${n}`;
  if (look === "combo") return `เครื่องซักผ้า+อบ ${n}`;
  return `เครื่องซักผ้า ${n}`;
}

function machineId(dormId: DormId, look: MachineLook, n: number) {
  const prefix = look === "dryer" ? "dr" : "wm";
  return `${dormId}-${prefix}-${pad(n)}`;
}

function spec(
  dormId: DormId,
  n: number,
  look: MachineLook,
): SeedMachine {
  const kind: MachineKind = look === "dryer" ? "dryer" : look === "combo" ? "combo" : "washer";
  return {
    id: machineId(dormId, look, n),
    label: labelFor(look, n),
    floor: n <= 8 ? 1 : 2,
    dormId,
    kind,
    look,
    number: n,
  };
}

function many(dormId: DormId, nums: number[], look: MachineLook) {
  return nums.map((n) => spec(dormId, n, look));
}

const INVENTORY: Record<DormId, SeedMachine[]> = {
  sri: [
    ...many("sri", [1, 2, 4, 5], "dryer"),
    ...many("sri", [3, 5], "black"),
    ...many("sri", seq(8, 17), "white"),
  ],
  lee: [
    ...many("lee", seq(1, 6), "white"),
    ...many("lee", [7, 8], "black"),
    ...many("lee", [9, 10], "dryer"),
  ],
  int: [spec("int", 1, "dryer"), ...many("int", seq(2, 5), "black")],
  chai: [
    ...many("chai", [1, 3, 5], "dryer"),
    ...many("chai", [2, 4, 6], "combo"),
    ...many("chai", seq(7, 11), "white"),
    ...many("chai", [12, 13], "grey"),
  ],
  kan: [...many("kan", seq(1, 7), "black"), ...many("kan", [8, 9], "dryer")],
};

export const SEED_MACHINES: SeedMachine[] = DORMS.flatMap((dorm) => INVENTORY[dorm.id]);

const SEED_BY_ID = new Map(SEED_MACHINES.map((item) => [item.id, item]));
const DORM_ORDER = new Map(DORMS.map((dorm, index) => [dorm.id, index]));

export function isMachineId(value: string) {
  return MACHINE_ID_RE.test(value);
}

export function seedForId(id: string) {
  return SEED_BY_ID.get(id);
}

export function dormById(id: string) {
  return DORMS.find((item) => item.id === id);
}

export function dormSortIndex(dormId: string) {
  return DORM_ORDER.get(dormId as DormId) ?? 99;
}

export type CycleMode = "wash" | "dry";

export const WASH_MINUTES = [30] as const;
export const DRY_MINUTES = [32, 40, 48] as const;
export const MIN_CYCLE_MINUTES = 1;
export const MAX_CYCLE_MINUTES = 180;

export function formatCycleLabel(minutes: number, locale: Locale = "th") {
  const n = Math.round(minutes);
  if (locale === "en") {
    if (n < 60) return `${n} min`;
    const hours = Math.floor(n / 60);
    const rest = n % 60;
    if (rest === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
    return `${hours} hr ${rest} min`;
  }
  if (n < 60) return `${n} นาที`;
  const hours = Math.floor(n / 60);
  const rest = n % 60;
  if (rest === 0) return hours === 1 ? "1 ชั่วโมง" : `${hours} ชั่วโมง`;
  return `${hours} ชม. ${rest} นาที`;
}

export function resolveCycleMode(kind: MachineKind, mode?: CycleMode | null): CycleMode {
  if (kind === "dryer" || mode === "dry") return "dry";
  return "wash";
}

export function cycleCopy(kind: MachineKind, mode?: CycleMode | null, locale: Locale = "th") {
  if (locale === "en") {
    if (kind === "combo" && !mode) {
      return { start: "Start wash/dry", doing: "wash/dry", done: "Finished", collect: "collect clothes" };
    }
    if (kind === "dryer" || mode === "dry") {
      return { start: "Start dry", doing: "dry", done: "Dry finished", collect: "collect from the dryer" };
    }
    return { start: "Start wash", doing: "wash", done: "Wash finished", collect: "collect clothes" };
  }
  if (kind === "combo" && !mode) {
    return { start: "เริ่มซัก/อบ", doing: "ซัก/อบ", done: "เสร็จแล้ว", collect: "เอาผ้าออก" };
  }
  if (kind === "dryer" || mode === "dry") {
    return { start: "เริ่มอบ", doing: "อบ", done: "อบเสร็จแล้ว", collect: "เอาผ้าออกจากตู้อบ" };
  }
  return { start: "เริ่มซัก", doing: "ซัก", done: "ซักเสร็จแล้ว", collect: "เอาผ้าออก" };
}

export function etaPhrase(
  kind: MachineKind,
  mode: CycleMode | null | undefined,
  endsAt: number,
  locale: Locale = "th",
) {
  const clock = bangkokClockLabel(endsAt);
  if (locale === "en") {
    if (kind === "dryer" || mode === "dry") return `Dry done around ${clock}`;
    return `Wash done around ${clock}`;
  }
  if (kind === "dryer" || mode === "dry") return `คาดว่าอบเสร็จ ${clock} น.`;
  return `คาดว่าซักเสร็จ ${clock} น.`;
}

