import { getAdminDb, getAdminMessaging, isAdminConfigured } from "@/lib/admin";

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
  const machinesSnap = await db.collection("machines").get();

  for (const machine of machinesSnap.docs) {
    const data = machine.data();
    if (data.status === "maintenance") continue;
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
    } else if (data.status === "reserved") {
      await machine.ref.update({
        status: "available",
        ownerUid: null,
        ownerName: null,
        reservedUntil: null,
        ticketNumber: null,
      });
    }
  }

  return { ok: true };
}
