import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) return JSON.parse(json);
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const account = getAccount();
if (!account) {
  console.error("Missing Firebase admin env (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.projectId ?? account.project_id,
      clientEmail: account.clientEmail ?? account.client_email,
      privateKey: account.privateKey ?? account.private_key,
    }),
  });
}

const db = getFirestore();
const machines = await db.collection("machines").get();
const batch = db.batch();
for (const doc of machines.docs) {
  batch.update(doc.ref, {
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
const tickets = await db.collection("tickets").where("status", "in", ["in_use", "waiting", "called"]).get();
for (const doc of tickets.docs) {
  batch.update(doc.ref, { status: "done", machineId: null });
}
await batch.commit();
console.log(`Cleared ${machines.size} machines and closed ${tickets.size} open tickets.`);
