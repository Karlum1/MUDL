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
  try {
    if (!cycle) {
      localStorage.removeItem(MY_CYCLE_KEY);
      return;
    }
    localStorage.setItem(MY_CYCLE_KEY, JSON.stringify(cycle));
  } catch {
    /* quota / private mode — start cycle still succeeds in Firestore */
  }
}

export function grantMachineScan(machineId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${SCAN_SESSION_PREFIX}${machineId}`, String(Date.now()));
  } catch {
    try {
      const keys = Object.keys(sessionStorage).filter((key) => key.startsWith(SCAN_SESSION_PREFIX));
      for (const key of keys) sessionStorage.removeItem(key);
      sessionStorage.setItem(`${SCAN_SESSION_PREFIX}${machineId}`, String(Date.now()));
    } catch {
      /* ignore */
    }
  }
}

export function hasValidMachineScan(machineId: string) {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(`${SCAN_SESSION_PREFIX}${machineId}`);
    const grantedAt = Number(raw);
    if (!Number.isFinite(grantedAt) || grantedAt <= 0) return false;
    return Date.now() - grantedAt < SCAN_TTL_MS;
  } catch {
    return false;
  }
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

let foregroundPushListening = false;

export async function registerWebPush(uid: string) {
  try {
    if (!isFirebaseConfigured()) return { ok: false, error: "ยังไม่ได้ตั้งค่า Firebase" };
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return { ok: false, error: "ยังไม่มี VAPID key บนเซิร์ฟเวอร์" };
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return { ok: false, error: "เบราว์เซอร์นี้ไม่รองรับ Web Push" };
    }
    if (!(await isSupported())) {
      if (isIosDevice() && !isStandaloneDisplay()) {
        return {
          ok: false,
          error: "บน iPhone/iPad ต้องเพิ่มแอปไปยังหน้าจอโฮม แล้วเปิดจากไอคอนนั้นก่อนเปิดแจ้งเตือน",
        };
      }
      return { ok: false, error: "เครื่องนี้ยังไม่รองรับ Web Push" };
    }
    if (typeof Notification === "undefined") {
      return { ok: false, error: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "ยังไม่ได้อนุญาตการแจ้งเตือนในเบราว์เซอร์" };
    }

    const registration = await Promise.race([
      navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
        updateViaCache: "none",
      }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("QUOTA_EXCEEDED")), 8000);
      }),
    ]);
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("QUOTA_EXCEEDED")), 8000);
      }),
    ]);

    const messaging = getMessaging(getFirebaseApp());
    const token = await Promise.race([
      getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      }),
      new Promise<null>((_, reject) => {
        window.setTimeout(() => reject(new Error("QUOTA_EXCEEDED")), 8000);
      }),
    ]);
    if (!token) return { ok: false, error: "ขอโทเคนแจ้งเตือนไม่สำเร็จ" };

    await setDoc(doc(getFirebaseDb(), "pushTokens", token), {
      uid,
      token,
      updatedAt: Date.now(),
    });

    if (!foregroundPushListening) {
      foregroundPushListening = true;
      onMessage(messaging, (payload) => {
        const title = payload.data?.title ?? payload.notification?.title ?? "ซักผ้าหอพัก";
        const body = payload.data?.body ?? payload.notification?.body ?? "";
        if (Notification.permission === "granted") {
          new Notification(title, { body, tag: payload.data?.tag });
        }
      });
    }

    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "เปิดแจ้งเตือนไม่สำเร็จ";
    return { ok: false, error: message };
  }
}
