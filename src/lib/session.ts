import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import {
  MY_CYCLE_KEY,
  SCAN_SESSION_PREFIX,
  SCAN_TTL_MS,
  type MyCycle,
} from "@/lib/types";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export function readMyCycle(): MyCycle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MY_CYCLE_KEY);
    return raw ? (JSON.parse(raw) as MyCycle) : null;
  } catch {
    return null;
  }
}

export function writeMyCycle(cycle: MyCycle | null) {
  if (typeof window === "undefined") return;
  if (!cycle) {
    localStorage.removeItem(MY_CYCLE_KEY);
    return;
  }
  localStorage.setItem(MY_CYCLE_KEY, JSON.stringify(cycle));
}

export function grantMachineScan(machineId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${SCAN_SESSION_PREFIX}${machineId}`, String(Date.now()));
}

export function hasValidMachineScan(machineId: string) {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(`${SCAN_SESSION_PREFIX}${machineId}`);
  const grantedAt = Number(raw);
  if (!Number.isFinite(grantedAt) || grantedAt <= 0) return false;
  return Date.now() - grantedAt < SCAN_TTL_MS;
}

export async function registerWebPush(uid: string) {
  try {
    if (!isFirebaseConfigured()) return false;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey || !(await isSupported())) return false;
    if (typeof Notification === "undefined") return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      ),
    });
    if (!token) return false;

    await setDoc(doc(getFirebaseDb(), "pushTokens", token), {
      uid,
      token,
      updatedAt: Date.now(),
    });

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "คิวเครื่องซักผ้า";
      const body = payload.notification?.body ?? "";
      if (Notification.permission === "granted") {
        new Notification(title, { body, tag: payload.data?.tag });
      }
    });

    return true;
  } catch {
    return false;
  }
}
