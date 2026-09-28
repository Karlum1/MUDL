import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, isAdminConfigured } from "@/lib/admin";
import { sendPushAndPrune } from "@/lib/pushCleanup";

const CLEAR_MACHINE = {
  status: "available",
  finishTime: null,
  cycleMinutes: null,
  cycleMode: null,
  almostAt: null,
  almostAlertSent: false,
  finishAlertSent: false,
  ownerUid: null,
  ownerName: null,
  ownerPhone: null,
  ticketNumber: null,
  reservedUntil: null,
  claimHash: null,
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
  return sendPushAndPrune(tokens, title, body, tag);
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

  if (body.action === "clearLogs") {
    let removed = 0;
    for (;;) {
      const snap = await db.collection("maintenanceLogs").limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      for (const item of snap.docs) batch.delete(item.ref);
      await batch.commit();
      removed += snap.size;
      if (snap.size < 400) break;
    }
    return { ok: true, removed };
  }

  throw new Error("UNKNOWN_ACTION");
}
