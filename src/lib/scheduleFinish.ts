import "server-only";

export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

export async function scheduleFinishPush(input: {
  machineId: string;
  ownerUid: string;
  finishTime: number;
}) {
  const token = process.env.QSTASH_TOKEN;
  const secret = process.env.CRON_SECRET;
  const base = appBaseUrl();
  if (!token || !secret || !base) return { scheduled: false as const, reason: "NO_QUEUE" };
  if (input.finishTime <= Date.now()) return { scheduled: false as const, reason: "ALREADY_DUE" };

  const destination = `${base}/api/notifications/send`;
  const response = await fetch(`https://qstash.upstash.io/v2/publish/${destination}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Not-Before": String(Math.floor(input.finishTime / 1000)),
      "Upstash-Retries": "3",
      "Upstash-Forward-Authorization": `Bearer ${secret}`,
    },
    body: JSON.stringify({
      machineId: input.machineId,
      ownerUid: input.ownerUid,
      finishTime: input.finishTime,
    }),
  });
  if (!response.ok) return { scheduled: false as const, reason: "QUEUE_REJECTED" };
  return { scheduled: true as const };
}
