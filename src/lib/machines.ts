import {
  Timestamp,
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
import { bangkokDateKey } from "@/lib/day";
import {
  COUNTERS_COLLECTION,
  MACHINES_COLLECTION,
  TICKETS_COLLECTION,
  getFirebaseDb,
} from "@/lib/firebase";
import { writeMyCycle } from "@/lib/session";
import type { Machine, MachineStatus, QueueTicket, TicketStatus } from "@/lib/types";

const DEMO_SECONDS = 20;
export const RESERVE_MS = 5 * 60 * 1000;

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
  } else if (rawStatus === "reserved" && reservedUntil && Date.now() >= reservedUntil) {
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
    ticketNumber: typeof data.ticketNumber === "number" ? data.ticketNumber : null,
    reservedUntil,
  };
}

export function ticketFromDoc(id: string, data: DocumentData): QueueTicket {
  return {
    id,
    dateKey: String(data.dateKey ?? ""),
    number: Number(data.number ?? 0),
    uid: String(data.uid ?? ""),
    status: (data.status as TicketStatus) ?? "waiting",
    machineId: typeof data.machineId === "string" ? data.machineId : null,
    createdAt: millisFromTimestamp(data.createdAt) ?? 0,
    calledAt: millisFromTimestamp(data.calledAt),
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
      ticketNumber: null,
      reservedUntil: null,
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

export function subscribeTodayTickets(
  onNext: (tickets: QueueTicket[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  const ticketsQuery = query(
    collection(db, TICKETS_COLLECTION),
    where("dateKey", "==", dateKey),
  );
  return onSnapshot(
    ticketsQuery,
    (snapshot) => {
      const tickets = snapshot.docs
        .map((item) => ticketFromDoc(item.id, item.data()))
        .sort((a, b) => a.number - b.number);
      onNext(tickets);
    },
    (error) => onError?.(error),
  );
}

async function nextDailyNumber(uid: string) {
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  const counterRef = doc(db, COUNTERS_COLLECTION, dateKey);
  const ticketRef = doc(collection(db, TICKETS_COLLECTION));

  const number = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = counter.exists() ? Number(counter.data().nextNumber ?? 0) + 1 : 1;
    tx.set(counterRef, { dateKey, nextNumber: next }, { merge: true });
    tx.set(ticketRef, {
      dateKey,
      number: next,
      uid,
      status: "waiting",
      machineId: null,
      createdAt: Timestamp.now(),
      calledAt: null,
    });
    return next;
  });

  return { ticketId: ticketRef.id, number, dateKey };
}

export async function joinQueue() {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  const existing = await getDocs(
    query(collection(db, TICKETS_COLLECTION), where("dateKey", "==", dateKey)),
  );
  const open = existing.docs
    .map((item) => ticketFromDoc(item.id, item.data()))
    .find(
      (t) =>
        t.uid === user.uid &&
        (t.status === "waiting" || t.status === "called" || t.status === "in_use"),
    );
  if (open) return { ticketId: open.id, number: open.number, dateKey };

  const machines = (await getDocs(collection(db, MACHINES_COLLECTION))).docs.map((item) =>
    machineFromDoc(item.id, item.data()),
  );
  const canWalkIn = machines.some(
    (m) =>
      m.status === "available" ||
      (m.status === "reserved" && m.ownerUid === user.uid),
  );
  if (canWalkIn) throw new Error("MACHINES_FREE");
  return nextDailyNumber(user.uid);
}

export async function startMachine(id: string, minutes: 30 | 45 | "demo" = 30) {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);
  const dateKey = bangkokDateKey();
  const durationMs =
    minutes === "demo" ? DEMO_SECONDS * 1000 : minutes * 60 * 1000;
  const now = Date.now();
  const warnLead = Math.min(5 * 60 * 1000, Math.max(5000, durationMs * 0.25));

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
    const data = snap.data();
    const rawStatus = String(data.status ?? "available");
    const reservedForMe =
      rawStatus === "reserved" && data.ownerUid === user.uid;

    if (rawStatus !== "available" && !reservedForMe) {
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
      reservedUntil: null,
    });
    return { finishTime: finishTime.toMillis() };
  });

  let ticketNumber = 0;
  try {
    const issued = await nextDailyNumber(user.uid);
    ticketNumber = issued.number;
    await runTransaction(db, async (tx) => {
      tx.update(doc(db, TICKETS_COLLECTION, issued.ticketId), {
        status: "in_use",
        machineId: id,
      });
      tx.update(ref, { ticketNumber });
    });
  } catch {
    /* machine already started; ticket is optional */
  }

  writeMyCycle({
    uid: user.uid,
    machineId: id,
    ticketNumber,
    finishTime: result.finishTime,
    startedAt: Date.now(),
  });

  return { ticketNumber, finishTime: result.finishTime };
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

export async function collectClothes(id: string) {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const ref = doc(db, MACHINES_COLLECTION, id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("MACHINE_NOT_FOUND");
    const current = machineFromDoc(id, snap.data());
    if (current.status !== "finished") throw new Error("NOT_FINISHED");
    if (current.ownerUid && current.ownerUid !== user.uid) {
      throw new Error("NOT_OWNER");
    }

    tx.update(ref, {
      status: "available",
      finishTime: null,
      cycleMinutes: null,
      almostAt: null,
      almostAlertSent: false,
      ownerUid: null,
      ticketNumber: null,
      reservedUntil: null,
    });
  });

  writeMyCycle(null);
  await fetch("/api/queue/dispatch", { method: "POST" }).catch(() => undefined);
}
