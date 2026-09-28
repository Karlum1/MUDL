import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/auth";
import { bumpDailyStats } from "@/lib/dailyStats";
import {
  SEED_MACHINES,
  dormById,
  dormSortIndex,
  resolveCycleMode,
  seedForId,
  type CycleMode,
  type MachineKind,
  type MachineLook,
} from "@/lib/dorms";
import {
  MACHINES_COLLECTION,
  ANNOUNCEMENTS_COLLECTION,
  MAINTENANCE_LOGS_COLLECTION,
  getFirebaseDb,
} from "@/lib/firebase";
import { writeMyCycle } from "@/lib/session";
import { ALMOST_LEAD_MS } from "@/lib/cycleTiming";
import type {
  Announcement,
  Machine,
  MachineStatus,
  MaintenanceLog,
} from "@/lib/types";

export const DEMO_SECONDS = 20;
export const MAX_OWNER_NAME = 24;
export const MAX_OWNER_PHONE = 12;
export const ANON_OWNER_NAME = "ไม่ระบุตัวตน";

function millisFromTimestamp(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  return null;
}

export function machineFromDoc(id: string, data: DocumentData): Machine {
  const finishTime = millisFromTimestamp(data.finishTime);
  const almostAt = millisFromTimestamp(data.almostAt);
  const reservedUntil = millisFromTimestamp(data.reservedUntil);
  const rawStatus = (data.status as MachineStatus) ?? "available";
  let status = rawStatus;
  if (rawStatus === "in_use" && finishTime && Date.now() >= finishTime) {
    status = "finished";
  } else if (rawStatus === "reserved") {
    status = "available";
  }

  const seed = seedForId(id);
  const kind: MachineKind =
    seed?.kind ??
    (data.kind === "dryer" ? "dryer" : data.kind === "combo" ? "combo" : "washer");
  const look: MachineLook = seed?.look ?? (kind === "dryer" ? "dryer" : "white");
  const dormId = seed?.dormId ?? (typeof data.dormId === "string" ? data.dormId : "");
  const dorm = dormById(dormId);

  return {
    id,
    label: seed?.label ?? (typeof data.label === "string" ? data.label : id),
    floor: seed?.floor ?? (typeof data.floor === "number" ? data.floor : 1),
    dormId,
    dormName: dorm?.name ?? "",
    halls: dorm?.halls ?? "",
    kind,
    look,
    number: seed?.number ?? (Number.parseInt(id.slice(-2), 10) || 0),
    status,
    cycleMinutes: typeof data.cycleMinutes === "number" ? data.cycleMinutes : null,
    cycleMode: data.cycleMode === "dry" ? "dry" : data.cycleMode === "wash" ? "wash" : null,
    finishTime,
    cycleEndsAt: finishTime,
    almostAt,
    almostAlertSent: Boolean(data.almostAlertSent),
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : null,
    ownerName: typeof data.ownerName === "string" ? data.ownerName : null,
    ownerPhone: typeof data.ownerPhone === "string" && data.ownerPhone.trim() ? data.ownerPhone.trim() : null,
    reservedUntil,
    maintenanceNote: typeof data.maintenanceNote === "string" ? data.maintenanceNote : null,
  };
}

const SEED_FLAG = "wm-machines-seeded-v1";

export async function seedMachinesIfEmpty(force = false) {
  if (!force && typeof window !== "undefined") {
    try {
      if (localStorage.getItem(SEED_FLAG)) return;
    } catch {
      /* continue */
    }
  }
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, MACHINES_COLLECTION));
  const existing = new Map(snap.docs.map((item) => [item.id, item]));
  const updates = writeBatch(db);
  let updateCount = 0;
  const creates = writeBatch(db);
  let createCount = 0;

  for (const machine of SEED_MACHINES) {
    const current = existing.get(machine.id);
    if (!current) {
      creates.set(doc(db, MACHINES_COLLECTION, machine.id), {
        label: machine.label,
        floor: machine.floor,
        dormId: machine.dormId,
        kind: machine.kind,
        look: machine.look,
        number: machine.number,
        status: "available",
        finishTime: null,
        cycleMinutes: null,
        cycleMode: null,
        almostAt: null,
        almostAlertSent: false,
        ownerUid: null,
        ownerName: null,
        ownerPhone: null,
        reservedUntil: null,
        maintenanceNote: null,
      });
      createCount += 1;
      continue;
    }
    const data = current.data();
    const status = String(data.status ?? "available");
    if (status !== "available") continue;
    if (
      data.dormId === machine.dormId &&
      data.kind === machine.kind &&
      data.look === machine.look &&
      data.number === machine.number &&
      data.label === machine.label
    ) {
      continue;
    }
    updates.update(doc(db, MACHINES_COLLECTION, machine.id), {
      label: machine.label,
      floor: machine.floor,
      dormId: machine.dormId,
      kind: machine.kind,
      look: machine.look,
      number: machine.number,
    });
    updateCount += 1;
  }

  if (updateCount) await updates.commit();
  if (createCount) {
    try {
      await creates.commit();
    } catch {
      /* ต้อง Publish firestore.rules ก่อนจึงจะสร้างเครื่องหอใหม่ได้ */
    }
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SEED_FLAG, "1");
    } catch {
      /* quota */
    }
  }
}

function sortLiveMachines(machines: Machine[]) {
  return machines.sort((a, b) => {
    const dorm = dormSortIndex(a.dormId) - dormSortIndex(b.dormId);
    if (dorm) return dorm;
    if (a.number !== b.number) return a.number - b.number;
    return a.id.localeCompare(b.id);
  });
}

function liveFromDocs(docs: QueryDocumentSnapshot[]) {
  return sortLiveMachines(
    docs.filter((item) => seedForId(item.id)).map((item) => machineFromDoc(item.id, item.data())),
  );
}

export type MachinesQuery = {
  all?: boolean;
  dormIds?: string[];
  machineId?: string | null;
};

export function subscribeMachines(
  onNext: (machines: Machine[]) => void,
  onError?: (error: Error) => void,
  scope: MachinesQuery = { all: true },
): Unsubscribe {
  const db = getFirebaseDb();
  const machineId = scope.machineId?.trim();
  if (machineId && !scope.all && !(scope.dormIds && scope.dormIds.length > 0)) {
    return onSnapshot(
      doc(db, MACHINES_COLLECTION, machineId),
      (snapshot) => {
        if (!snapshot.exists() || !seedForId(snapshot.id)) {
          onNext([]);
          return;
        }
        onNext(sortLiveMachines([machineFromDoc(snapshot.id, snapshot.data())]));
      },
      (error) => onError?.(error),
    );
  }
  const dormIds = [...new Set((scope.dormIds ?? []).filter(Boolean))].slice(0, 10);
  const target =
    !scope.all && dormIds.length > 0
      ? query(collection(db, MACHINES_COLLECTION), where("dormId", "in", dormIds))
      : collection(db, MACHINES_COLLECTION);
  return onSnapshot(
    target,
    (snapshot) => onNext(liveFromDocs(snapshot.docs)),
    (error) => onError?.(error),
  );
}

export function subscribeAnnouncements(
  onNext: (items: Announcement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, ANNOUNCEMENTS_COLLECTION),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            messageTh: String(data.messageTh ?? ""),
            createdAt: millisFromTimestamp(data.createdAt) ?? 0,
            active: data.active !== false,
          } satisfies Announcement;
        })
        .filter((item) => item.active && item.messageTh)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);
      onNext(items);
    },
    (error) => onError?.(error),
  );
}

export function subscribeMaintenanceLogs(
  onNext: (items: MaintenanceLog[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, MAINTENANCE_LOGS_COLLECTION),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            machineId: String(data.machineId ?? ""),
            action: String(data.action ?? ""),
            note: String(data.note ?? ""),
            createdAt: millisFromTimestamp(data.createdAt) ?? 0,
          } satisfies MaintenanceLog;
        })
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 80);
      onNext(items);
    },
    (error) => onError?.(error),
  );
}

export function normalizeOwnerName(value: string) {
  return value.trim().slice(0, MAX_OWNER_NAME) || ANON_OWNER_NAME;
}

export function normalizeOwnerPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "").slice(0, MAX_OWNER_PHONE);
  return digits;
}

export function displayOwnerName(
  name: string | null | undefined,
  locale: "th" | "en" = "th",
) {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== ANON_OWNER_NAME && trimmed !== "Anonymous") return trimmed;
  return locale === "en" ? "Anonymous" : ANON_OWNER_NAME;
}

export async function reportMachineIssue(id: string, note: string) {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const text = note.trim().slice(0, 200) || "แจ้งเครื่องเสีย";
  await addDoc(collection(db, MAINTENANCE_LOGS_COLLECTION), {
    machineId: id,
    action: "report",
    note: text,
    createdAt: Timestamp.now(),
  });
}

export async function startMachine(
  id: string,
  minutes: number | "demo" = 30,
  ownerName: string,
  ownerPhone = "",
  cycleMode?: CycleMode,
) {
  const name = normalizeOwnerName(ownerName);
  const phone = normalizeOwnerPhone(ownerPhone);
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  if (minutes !== "demo" && (!Number.isFinite(minutes) || minutes < 1 || minutes > 180)) {
    throw new Error("INVALID_MINUTES");
  }
  const durationMs =
    minutes === "demo" ? DEMO_SECONDS * 1000 : Math.round(minutes) * 60 * 1000;
  const now = Date.now();
  const warnLead = Math.min(ALMOST_LEAD_MS, Math.max(3000, durationMs - 3000));

  const result = await Promise.race([
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
      const data = snap.data();
      const rawStatus = String(data.status ?? "available");
      if (rawStatus === "maintenance") throw new Error("MACHINE_MAINTENANCE");
      if (rawStatus !== "available" && rawStatus !== "reserved") {
        throw new Error("MACHINE_BUSY");
      }
      const seed = seedForId(id);
      const kind: MachineKind =
        seed?.kind ??
        (data.kind === "dryer" ? "dryer" : data.kind === "combo" ? "combo" : "washer");
      const mode = resolveCycleMode(kind, cycleMode);

      const finishTime = Timestamp.fromMillis(now + durationMs);
      tx.update(ref, {
        status: "in_use",
        finishTime,
        cycleMinutes: minutes === "demo" ? 0 : Math.round(minutes),
        cycleMode: mode,
        almostAt: Timestamp.fromMillis(now + durationMs - warnLead),
        almostAlertSent: false,
        finishAlertSent: false,
        ownerUid: user.uid,
        ownerName: name,
        ownerPhone: phone || null,
        reservedUntil: null,
        ticketNumber: null,
      });
      return { finishTime: finishTime.toMillis() };
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("START_TIMEOUT")), 7000);
    }),
  ]);

  writeMyCycle({
    uid: user.uid,
    machineId: id,
    ownerName: name,
    finishTime: result.finishTime,
    startedAt: Date.now(),
  });

  void bumpDailyStats("booking").catch(() => undefined);

  return result;
}

export async function markMachineFinished(id: string) {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status !== "in_use") return;
    if (data.ownerUid && data.ownerUid !== user.uid) return;
    tx.update(ref, { status: "finished", almostAlertSent: true });
  });
}

export async function markAlmostAlertSent(id: string) {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.ownerUid && data.ownerUid !== user.uid) return;
    if (data.almostAlertSent) return;
    tx.update(ref, { almostAlertSent: true });
  });
}

const FREE_MACHINE = {
  status: "available" as const,
  finishTime: null,
  cycleMinutes: null,
  cycleMode: null,
  almostAt: null,
  almostAlertSent: false,
  ownerUid: null,
  ownerName: null,
  ownerPhone: null,
  ticketNumber: null,
  reservedUntil: null,
};

export async function collectClothes(id: string) {
  await releaseMachine(id, "finished", "NOT_FINISHED");
}

export async function cancelCycle(id: string) {
  await releaseMachine(id, "in_use", "NOT_IN_USE");
}

async function releaseMachine(
  id: string,
  expectedStatus: "finished" | "in_use",
  wrongStatusError: string,
) {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
    const current = machineFromDoc(id, snap.data());
    if (current.status !== expectedStatus) throw new Error(wrongStatusError);
    if (current.ownerUid && current.ownerUid !== user.uid) {
      throw new Error("NOT_OWNER");
    }
    tx.update(ref, FREE_MACHINE);
  });

  writeMyCycle(null);
}
