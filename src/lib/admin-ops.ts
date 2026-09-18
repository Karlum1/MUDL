import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/admin";
import { bangkokDateKey } from "@/lib/day";
import { dispatchNext } from "@/lib/tick";

const CLEAR_FIELDS = {
  status: "available",
  finishTime: null,
  cycleMinutes: null,
  almostAt: null,
  almostAlertSent: false,
  ownerUid: null,
  ticketNumber: null,
  reservedUntil: null,
};

export async function adminReleaseMachine(machineId: string) {
  const db = getAdminDb();
  const ref = db.collection("machines").doc(machineId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("MACHINE_NOT_FOUND");
  const ticketNumber = snap.data()?.ticketNumber;
  await ref.update({ ...CLEAR_FIELDS, status: "available" });
  if (typeof ticketNumber === "number") {
    const dateKey = bangkokDateKey();
    const tickets = await db
      .collection("tickets")
      .where("dateKey", "==", dateKey)
      .where("number", "==", ticketNumber)
      .get();
    for (const ticket of tickets.docs) {
      if (["in_use", "called", "waiting"].includes(String(ticket.data().status))) {
        await ticket.ref.update({ status: "done", machineId: null });
      }
    }
  }
  await dispatchNext();
}

export async function adminSetBroken(machineId: string, broken: boolean) {
  const db = getAdminDb();
  const ref = db.collection("machines").doc(machineId);
  if (broken) {
    await ref.update({
      ...CLEAR_FIELDS,
      status: "out_of_order",
    });
  } else {
    await ref.update({ ...CLEAR_FIELDS, status: "available" });
  }
}

export async function adminCancelTicket(ticketId: string) {
  const db = getAdminDb();
  const ref = db.collection("tickets").doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("TICKET_NOT_FOUND");
  const data = snap.data() ?? {};
  await ref.update({ status: "cancelled" });
  if (data.status === "called" && typeof data.machineId === "string") {
    await db.collection("machines").doc(data.machineId).update({
      ...CLEAR_FIELDS,
      status: "available",
    });
  }
  await dispatchNext();
}

export async function adminResetTodayQueue() {
  const db = getAdminDb();
  const dateKey = bangkokDateKey();
  const tickets = await db.collection("tickets").where("dateKey", "==", dateKey).get();
  for (const ticket of tickets.docs) {
    const status = String(ticket.data().status);
    if (status === "waiting" || status === "called") {
      await ticket.ref.update({ status: "cancelled" });
    }
  }
  const machines = await db.collection("machines").get();
  for (const machine of machines.docs) {
    if (machine.data().status === "reserved") {
      await machine.ref.update({ ...CLEAR_FIELDS, status: "available" });
    }
  }
}

export async function adminDispatch() {
  return dispatchNext();
}

export { Timestamp };
