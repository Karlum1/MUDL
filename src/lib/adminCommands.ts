import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminMessaging, isAdminConfigured } from "@/lib/admin";

const CLEAR_MACHINE = {
  status: "available",
  finishTime: null,
  cycleMinutes: null,
  almostAt: null,
  almostAlertSent: false,
  ownerUid: null,
  ownerName: null,
  ticketNumber: null,
  reservedUntil: null,
  maintenanceNote: null,
};

async function logAction(machineId: string, action: string, note: string) {
  const db = getAdminDb();
  await db.collection("maintenanceLogs").add({
    machineId,
    action,
    note,
    createdAt: Timestamp.now(),
  });
}

async function sendToAll(title: string, body: string, tag: string) {
  const db = getAdminDb();
  const snap = await db.collection("pushTokens").get();
  const tokens = snap.docs.map((item) => item.id).filter(Boolean);
  if (tokens.length === 0) return { sent: 0 };
  const messaging = getAdminMessaging();
  const chunkSize = 500;
  let sent = 0;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const result = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: "/" },
        notification: { tag },
      },
      data: { tag },
    });
    sent += result.successCount;
  }
  return { sent };
}

export async function runAdminCommand(body: {
  action: string;
  machineId?: string;
  note?: string;
  messageTh?: string;
  push?: boolean;
}) {
  if (!isAdminConfigured()) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  const db = getAdminDb();
  const note = (body.note ?? "").trim().slice(0, 200);
  const machineId = body.machineId ?? "";

  if (body.action === "reset") {
    if (!machineId) throw new Error("MACHINE_NOT_FOUND");
    await db.collection("machines").doc(machineId).update(CLEAR_MACHINE);
    await logAction(machineId, "reset", note || "รีเซ็ตสถานะเครื่อง");
    return { ok: true };
  }

  if (body.action === "maintenance") {
    if (!machineId) throw new Error("MACHINE_NOT_FOUND");
    await db.collection("machines").doc(machineId).update({
      ...CLEAR_MACHINE,
      status: "maintenance",
      maintenanceNote: note || "ปิดปรับปรุงชั่วคราว",
    });
    await logAction(machineId, "maintenance", note || "ปิดปรับปรุงชั่วคราว");
    return { ok: true };
  }

  if (body.action === "reopen") {
    if (!machineId) throw new Error("MACHINE_NOT_FOUND");
    await db.collection("machines").doc(machineId).update(CLEAR_MACHINE);
    await logAction(machineId, "reopen", note || "เปิดใช้งานอีกครั้ง");
    return { ok: true };
  }

  if (body.action === "announce") {
    const messageTh = (body.messageTh ?? "").trim().slice(0, 280);
    if (!messageTh) throw new Error("ANNOUNCEMENT_REQUIRED");
    await db.collection("announcements").add({
      messageTh,
      createdAt: Timestamp.now(),
      active: true,
    });
    let pushed = 0;
    if (body.push) {
      const result = await sendToAll("ประกาศห้องซักผ้า", messageTh, `announce-${Date.now()}`);
      pushed = result.sent;
    }
    await logAction("all", "announce", messageTh);
    return { ok: true, pushed };
  }

  throw new Error("UNKNOWN_ACTION");
}
