import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminMessaging, isAdminConfigured } from "@/lib/admin";
import { bangkokDateKey } from "@/lib/day";

const RESERVE_MS = 5 * 60 * 1000;

async function sendToUid(
  uid: string,
  title: string,
  body: string,
  tag: string,
) {
  const db = getAdminDb();
  const snap = await db.collection("pushTokens").where("uid", "==", uid).get();
  const tokens = snap.docs.map((item) => item.id).filter(Boolean);
  if (tokens.length === 0) return;
  const messaging = getAdminMessaging();
  await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: { link: "/" },
      notification: { tag },
    },
    data: { tag },
  });
}

export async function runLaundryTick() {
  if (!isAdminConfigured()) {
    return { ok: false, reason: "FIREBASE_ADMIN_NOT_CONFIGURED" };
  }

  const db = getAdminDb();
  const now = Date.now();
  const dateKey = bangkokDateKey();
  const machinesSnap = await db.collection("machines").get();

  for (const machine of machinesSnap.docs) {
    const data = machine.data();
    if (data.status === "in_use" && data.finishTime?.toMillis?.() <= now) {
      await machine.ref.update({ status: "finished", almostAlertSent: true });
      if (typeof data.ownerUid === "string") {
        await sendToUid(
          data.ownerUid,
          "ซักเสร็จแล้ว",
          `${data.label ?? machine.id} เสร็จแล้ว กรุณาเอาผ้าออก`,
          `${machine.id}-finished`,
        );
      }
    } else if (
      data.status === "in_use" &&
      data.almostAt?.toMillis?.() <= now &&
      now < (data.finishTime?.toMillis?.() ?? 0) &&
      !data.almostAlertSent &&
      typeof data.ownerUid === "string"
    ) {
      await machine.ref.update({ almostAlertSent: true });
      await sendToUid(
        data.ownerUid,
        "ใกล้เสร็จแล้ว",
        `${data.label ?? machine.id} เหลืออีกประมาณ 5 นาที`,
        `${machine.id}-almost`,
      );
    } else if (
      data.status === "reserved" &&
      data.reservedUntil?.toMillis?.() <= now
    ) {
      await machine.ref.update({
        status: "available",
        ownerUid: null,
        reservedUntil: null,
        ticketNumber: null,
      });
    }
  }

  const calledSnap = await db
    .collection("tickets")
    .where("dateKey", "==", dateKey)
    .where("status", "==", "called")
    .get();
  for (const ticket of calledSnap.docs) {
    const calledAt = ticket.data().calledAt?.toMillis?.() ?? 0;
    if (calledAt && now - calledAt > RESERVE_MS) {
      await ticket.ref.update({ status: "expired" });
    }
  }

  await dispatchNext(dateKey);
  return { ok: true };
}

export async function dispatchNext(dateKey = bangkokDateKey()) {
  if (!isAdminConfigured()) return { ok: false };
  const db = getAdminDb();
  const machinesSnap = await db.collection("machines").get();
  const free = machinesSnap.docs.filter((item) => item.data().status === "available");
  if (free.length === 0) return { ok: true, assigned: 0 };

  const waitingSnap = await db
    .collection("tickets")
    .where("dateKey", "==", dateKey)
    .where("status", "==", "waiting")
    .orderBy("number", "asc")
    .limit(free.length)
    .get();

  let assigned = 0;
  for (const [index, ticket] of waitingSnap.docs.entries()) {
    const machine = free[index];
    if (!machine) break;
    const number = ticket.data().number;
    const uid = ticket.data().uid;
    await machine.ref.update({
      status: "reserved",
      ownerUid: uid,
      ticketNumber: number,
      reservedUntil: Timestamp.fromMillis(Date.now() + RESERVE_MS),
    });
    await ticket.ref.update({
      status: "called",
      machineId: machine.id,
      calledAt: Timestamp.now(),
    });
    await sendToUid(
      uid,
      "ถึงคิวแล้ว",
      `คิว ${number} ถึงแล้ว — ไปเริ่มซักที่ ${machine.data().label ?? machine.id} ภายใน 5 นาที`,
      `ticket-${number}`,
    );
    assigned += 1;
  }
  return { ok: true, assigned };
}
