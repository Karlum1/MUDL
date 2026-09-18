import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import {
  MACHINES_COLLECTION,
  getFirebaseDb,
} from "@/lib/firebase";
import type { Machine, MachineStatus } from "@/lib/types";

const DEMO_SECONDS = 20;

export const SEED_MACHINES: Omit<
  Machine,
  "cycleEndsAt" | "finishTime" | "almostAt" | "almostAlertSent" | "cycleMinutes"
>[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `wm-${String(n).padStart(2, "0")}`,
  label: `เครื่อง ${n}`,
  floor: n <= 3 ? 1 : 2,
  status: "available" as const,
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
  const rawStatus = (data.status as MachineStatus) ?? "available";
  const status =
    rawStatus === "in_use" && finishTime && Date.now() >= finishTime
      ? "finished"
      : rawStatus;

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
  };
}

export async function seedMachinesIfEmpty() {
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
    });
  }
  await batch.commit();
}

export function subscribeMachines(
  onNext: (machines: Machine[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const machinesQuery = query(collection(db, MACHINES_COLLECTION));

  return onSnapshot(
    machinesQuery,
    (snapshot) => {
      const machines = snapshot.docs
        .map((item) => machineFromDoc(item.id, item.data()))
        .sort((a, b) => a.id.localeCompare(b.id));
      onNext(machines);
    },
    (error) => onError?.(error),
  );
}

export async function startMachine(
  id: string,
  minutes: 30 | 45 | "demo" = 30,
) {
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");

    const current = machineFromDoc(id, snap.data());
    if (current.status !== "available") throw new Error("MACHINE_BUSY");

    const durationMs =
      minutes === "demo" ? DEMO_SECONDS * 1000 : minutes * 60 * 1000;
    const now = Date.now();
    const warnLead = Math.min(5 * 60 * 1000, Math.max(5000, durationMs * 0.25));
    const finishTime = Timestamp.fromMillis(now + durationMs);

    tx.update(ref, {
      status: "in_use",
      finishTime,
      cycleMinutes: minutes === "demo" ? 0 : minutes,
      almostAt: Timestamp.fromMillis(now + durationMs - warnLead),
      almostAlertSent: false,
    });
  });
}

export async function markMachineFinished(id: string) {
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status !== "in_use") return;
    tx.update(ref, {
      status: "finished",
      almostAlertSent: true,
    });
  });
}

export async function markAlmostAlertSent(id: string) {
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    if (snap.data().almostAlertSent) return;
    tx.update(ref, { almostAlertSent: true });
  });
}

export async function collectClothes(id: string) {
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
    const current = machineFromDoc(id, snap.data());
    if (current.status !== "finished") throw new Error("NOT_FINISHED");

    tx.update(ref, {
      status: "available",
      finishTime: null,
      cycleMinutes: null,
      almostAt: null,
      almostAlertSent: false,
    });
  });
}
