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
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/auth";
import { bangkokDateKey, bangkokHour } from "@/lib/day";
import {
  MACHINES_COLLECTION,
  USAGE_EVENTS_COLLECTION,
  ANNOUNCEMENTS_COLLECTION,
  MAINTENANCE_LOGS_COLLECTION,
  getFirebaseDb,
} from "@/lib/firebase";
import { writeMyCycle } from "@/lib/session";
import type {
  Announcement,
  Machine,
  MachineStatus,
  MaintenanceLog,
} from "@/lib/types";

const DEMO_SECONDS = 20;
export const MAX_OWNER_NAME = 24;
export const ANON_OWNER_NAME = "ไม่ระบุตัวตน";

export const SEED_MACHINES = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `wm-${String(n).padStart(2, "0")}`,
  label: `เครื่อง ${n}`,
  floor: n <= 3 ? 1 : 2,
}));

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

  return {
    id,
    label: typeof data.label === "string" ? data.label : id,
    floor: typeof data.floor === "number" ? data.floor : 1,
    status,
    cycleMinutes: typeof data.cycleMinutes === "number" ? data.cycleMinutes : null,
    finishTime,
    cycleEndsAt: finishTime,
    almostAt,
    almostAlertSent: Boolean(data.almostAlertSent),
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : null,
    ownerName: typeof data.ownerName === "string" ? data.ownerName : null,
    reservedUntil,
    maintenanceNote: typeof data.maintenanceNote === "string" ? data.maintenanceNote : null,
  };
}

export async function seedMachinesIfEmpty() {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, MACHINES_COLLECTION));
  if (!snap.empty) return;

  const batch = writeBatch(db);
  for (const machine of SEED_MACHINES) {
    batch.set(doc(db, MACHINES_COLLECTION, machine.id), {
      label: machine.label,
      floor: machine.floor,
      status: "available",
      finishTime: null,
      cycleMinutes: null,
      almostAt: null,
      almostAlertSent: false,
      ownerUid: null,
      ownerName: null,
      reservedUntil: null,
      maintenanceNote: null,
    });
  }
  await batch.commit();
}

export function subscribeMachines(
  onNext: (machines: Machine[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, MACHINES_COLLECTION),
    (snapshot) => {
      const machines = snapshot.docs
        .map((item) => machineFromDoc(item.id, item.data()))
        .sort((a, b) => a.id.localeCompare(b.id));
      onNext(machines);
    },
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
        .slice(0, 30);
      onNext(items);
    },
    (error) => onError?.(error),
  );
}

export function subscribeUsageHours(
  onNext: (hours: number[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  const usageQuery = query(
    collection(db, USAGE_EVENTS_COLLECTION),
    where("dateKey", "==", dateKey),
  );
  return onSnapshot(
    usageQuery,
    (snapshot) => {
      const hours = Array.from({ length: 24 }, () => 0);
      for (const item of snapshot.docs) {
        const hour = Number(item.data().hour ?? 0);
        if (hour >= 0 && hour <= 23) hours[hour] += 1;
      }
      onNext(hours);
    },
    (error) => onError?.(error),
  );
}

export function normalizeOwnerName(value: string) {
  return value.trim().slice(0, MAX_OWNER_NAME) || ANON_OWNER_NAME;
}

export function displayOwnerName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed || ANON_OWNER_NAME;
}

export async function startMachine(
  id: string,
  minutes: 30 | 45 | "demo" = 30,
  ownerName: string,
) {
  const name = normalizeOwnerName(ownerName);
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  const durationMs =
    minutes === "demo" ? DEMO_SECONDS * 1000 : minutes * 60 * 1000;
  const now = Date.now();
  const warnLead = Math.min(5 * 60 * 1000, Math.max(5000, durationMs * 0.25));

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
    const data = snap.data();
    const rawStatus = String(data.status ?? "available");
    if (rawStatus === "maintenance") throw new Error("MACHINE_MAINTENANCE");
    if (rawStatus !== "available" && rawStatus !== "reserved") {
      throw new Error("MACHINE_BUSY");
    }

    const finishTime = Timestamp.fromMillis(now + durationMs);
    tx.update(ref, {
      status: "in_use",
      finishTime,
      cycleMinutes: minutes === "demo" ? 0 : minutes,
      almostAt: Timestamp.fromMillis(now + durationMs - warnLead),
      almostAlertSent: false,
      ownerUid: user.uid,
      ownerName: name,
      reservedUntil: null,
      ticketNumber: null,
    });
    return { finishTime: finishTime.toMillis() };
  });

  writeMyCycle({
    uid: user.uid,
    machineId: id,
    ownerName: name,
    finishTime: result.finishTime,
    startedAt: Date.now(),
  });

  await addDoc(collection(db, USAGE_EVENTS_COLLECTION), {
    machineId: id,
    dateKey: bangkokDateKey(),
    hour: bangkokHour(),
    createdAt: Timestamp.now(),
  }).catch(() => undefined);

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
  almostAt: null,
  almostAlertSent: false,
  ownerUid: null,
  ownerName: null,
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
