import { getAdminDb, getAdminMessaging } from "@/lib/admin";

const DEAD_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/mismatched-credential",
]);

function isDeadTokenError(error: { code?: string; message?: string } | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  const blob = `${code} ${message}`.toLowerCase();
  return (
    DEAD_CODES.has(code) ||
    blob.includes("registration-token-not-registered") ||
    blob.includes("requested entity was not found") ||
    blob.includes("not a valid fcm") ||
    blob.includes("unregistered")
  );
}

async function deleteDeadTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  const db = getAdminDb();
  await Promise.all(
    tokens.map((token) => db.collection("pushTokens").doc(token).delete().catch(() => undefined)),
  );
}

export async function sendPushToUid(uid: string, title: string, body: string, tag: string) {
  const db = getAdminDb();
  const snap = await db.collection("pushTokens").where("uid", "==", uid).get();
  const tokens = snap.docs.map((item) => item.id).filter(Boolean);
  return sendPushAndPrune(tokens, title, body, tag);
}

export async function sendPushAndPrune(
  tokens: string[],
  title: string,
  body: string,
  tag: string,
) {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) return { sent: 0, pruned: 0 };
  const messaging = getAdminMessaging();
  const chunkSize = 500;
  let sent = 0;
  let pruned = 0;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const result = await messaging.sendEachForMulticast({
      tokens: chunk,
      data: { title, body, tag, url: "/" },
      notification: { title, body },
      webpush: {
        notification: { title, body, tag, renotify: true },
        fcmOptions: { link: "/" },
        headers: { Urgency: "high", TTL: "86400" },
      },
    });
    sent += result.successCount;
    const dead = chunk.filter((token, index) => isDeadTokenError(result.responses[index]?.error));
    await deleteDeadTokens(dead);
    pruned += dead.length;
  }
  return { sent, pruned };
}
