import "server-only";

import { getAdminDb } from "@/lib/admin";
import { sendPushToUid } from "@/lib/pushCleanup";

export async function deliverFinishAlert(
  machineId: string,
  expect?: { finishTime: number; ownerUid: string },
) {
  const db = getAdminDb();
  const ref = db.collection("machines").doc(machineId);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const finishMs = data.finishTime?.toMillis?.() as number | undefined;
    if (data.status !== "in_use" || !finishMs) return null;
    if (finishMs > Date.now() + 15_000) return null;
    if (expect && (data.ownerUid !== expect.ownerUid || finishMs !== expect.finishTime)) return null;
    if (data.finishAlertSent) return null;
    const uid = typeof data.ownerUid === "string" ? data.ownerUid : "";
    const label = String(data.label ?? machineId);
    tx.update(ref, { status: "finished", almostAlertSent: true, finishAlertSent: true });
    return { uid, label };
  });
  if (!claimed?.uid) return false;
  await sendPushToUid(
    claimed.uid,
    "ซักเสร็จแล้ว",
    `${claimed.label} เสร็จแล้ว กรุณาเอาผ้าออก`,
    `${machineId}-finished`,
  );
  return true;
}
