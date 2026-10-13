import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, isAdminConfigured } from "@/lib/admin";
import { sendPushToUid } from "@/lib/pushCleanup";
import { deliverFinishAlert } from "@/lib/finishAlert";
import { FINISHED_STALE_MINUTES, FINISHED_STALE_MS, remainingCycleMinutes } from "@/lib/cycleTiming";
import { bangkokHour, bangkokMinute } from "@/lib/day";

const FREE_MACHINE = {
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
};

async function safePush(uid: string, title: string, body: string, tag: string) {
  try {
    await sendPushToUid(uid, title, body, tag);
  } catch (error) {
    console.error("push failed", tag, error);
  }
}

async function logAdmin(machineId: string, action: string, note: string) {
  const db = getAdminDb();
  await db.collection("maintenanceLogs").add({
    machineId,
    action,
    note,
    createdAt: Timestamp.now(),
  });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 400;

async function deleteOldDocs(collectionName: string, cutoff: Timestamp) {
  const db = getAdminDb();
  const snap = await db
    .collection(collectionName)
    .where("createdAt", "<", cutoff)
    .limit(CLEANUP_BATCH)
    .get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const item of snap.docs) batch.delete(item.ref);
  await batch.commit();
  return snap.size;
}

async function cleanupStaleLogs() {
  if (bangkokHour() !== 3 || bangkokMinute() !== 0) return 0;
  const usageCutoff = Timestamp.fromMillis(Date.now() - THIRTY_DAYS_MS);
  const logCutoff = Timestamp.fromMillis(Date.now() - WEEK_MS);
  const usage = await deleteOldDocs("usageEvents", usageCutoff);
  const logs = await deleteOldDocs("maintenanceLogs", logCutoff);
  return usage + logs;
}

export async function runLaundryTick() {
  if (!isAdminConfigured()) {
    return { ok: false, reason: "FIREBASE_ADMIN_NOT_CONFIGURED" };
  }

  const db = getAdminDb();
  const now = Date.now();
  const machinesSnap = await db.collection("machines").get();
  const active = machinesSnap.docs.filter((item) => {
    const status = String(item.data().status ?? "");
    return status === "in_use" || status === "finished" || status === "reserved";
  });
  const freeIds = new Set<string>();
  const labels = new Map<string, string>();

  for (const machine of active) {
    const data = machine.data();
    labels.set(machine.id, String(data.label ?? machine.id));
    if (data.status === "maintenance") continue;
    try {

    const finishMs = data.finishTime?.toMillis?.() as number | undefined;
    const almostMs = data.almostAt?.toMillis?.() as number | undefined;

    if (
      (data.status === "in_use" || data.status === "finished") &&
      finishMs &&
      finishMs + FINISHED_STALE_MS <= now
    ) {
      const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : "";
      const label = String(data.label ?? machine.id);
      await machine.ref.update(FREE_MACHINE);
      await logAdmin(
        machine.id,
        "auto_release",
        `ปล่อยเครื่องว่างอัตโนมัติ หลังผ้าค้างเกิน ${FINISHED_STALE_MINUTES} นาที`,
      );
      freeIds.add(machine.id);
      if (ownerUid) {
        await safePush(
          ownerUid,
          "ระบบนำผ้าออกแล้ว",
          `${label} ระบบได้นำผ้าของคุณออกอัตโนมัติแล้ว`,
          `${machine.id}-auto-collect`,
        );
      }
      continue;
    }

    if (data.status === "in_use" && finishMs && finishMs <= now) {
      await deliverFinishAlert(machine.id);
    } else if (
      data.status === "in_use" &&
      almostMs &&
      almostMs <= now &&
      finishMs &&
      now < finishMs &&
      !data.almostAlertSent &&
      typeof data.ownerUid === "string"
    ) {
      await machine.ref.update({ almostAlertSent: true });
      const mins = remainingCycleMinutes(finishMs, now);
      await safePush(
        data.ownerUid,
        "ใกล้เสร็จแล้ว",
        `${data.label ?? machine.id} ใกล้เสร็จแล้ว เหลืออีกประมาณ ${mins} นาที กรุณาเตรียมไปรับผ้า`,
        `${machine.id}-almost`,
      );
    } else if (data.status === "reserved") {
      await machine.ref.update({
        status: "available",
        ownerUid: null,
        ownerName: null,
        reservedUntil: null,
        ticketNumber: null,
      });
      freeIds.add(machine.id);
    }
    } catch (error) {
      console.error("tick machine failed", machine.id, error);
    }
  }

  try {
    const watches = await db.collection("machineWatches").get();
    const busyIds = new Set(active.map((item) => item.id));
    const extraIds = new Set<string>();
    for (const watch of watches.docs) {
      const machineId = String(watch.data().machineId ?? "");
      if (machineId && !busyIds.has(machineId) && !freeIds.has(machineId)) extraIds.add(machineId);
    }
    for (const id of extraIds) {
      const extra = await db.collection("machines").doc(id).get();
      const status = String(extra.data()?.status ?? "available");
      if (status === "available") {
        freeIds.add(id);
        labels.set(id, String(extra.data()?.label ?? id));
      }
    }

    for (const watch of watches.docs) {
      const data = watch.data();
      const machineId = String(data.machineId ?? "");
      const uid = String(data.uid ?? "");
      if (!freeIds.has(machineId) || !uid) continue;
      const label = labels.get(machineId) ?? machineId;
      await safePush(uid, "เครื่องว่างแล้ว", `${label} ว่างแล้ว ไปสแกน QR ได้`, `${machineId}-free`);
      await watch.ref.delete();
    }

    const cleaned = await cleanupStaleLogs();
    return { ok: true, cleaned };
  } catch (error) {
    console.error("tick watches failed", error);
    return { ok: true, cleaned: 0 };
  }
}
