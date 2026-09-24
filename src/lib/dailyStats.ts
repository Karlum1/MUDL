import { bangkokDateKey, bangkokDaysInMonth, bangkokHour } from "@/lib/day";
import { DAILY_STATS_COLLECTION, getFirebaseDb } from "@/lib/firebase";
import {
  collection,
  doc,
  documentId,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

const USER_STAT_PREFIX = "wm-daily-user-v1:";

function hoursFromData(data: Record<string, unknown> | undefined) {
  const raw = data?.hours;
  const hours = Array.from({ length: 24 }, () => 0);
  if (!raw || typeof raw !== "object") return hours;
  const map = raw as Record<string, unknown>;
  for (let hour = 0; hour < 24; hour += 1) {
    hours[hour] = Number(map[String(hour)] ?? 0) || 0;
  }
  return hours;
}

export async function bumpDailyStats(kind: "booking" | "activeUser") {
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  const ref = doc(db, DAILY_STATS_COLLECTION, dateKey);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (kind === "booking") {
    payload.totalBookings = increment(1);
    payload[`hours.${bangkokHour()}`] = increment(1);
  } else {
    payload.activeUsersCount = increment(1);
  }
  await setDoc(ref, payload, { merge: true });
}

export function recordActiveUserOnce() {
  if (typeof window === "undefined") return;
  const key = `${USER_STAT_PREFIX}${bangkokDateKey()}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* quota — still try once */
  }
  void bumpDailyStats("activeUser").catch(() => undefined);
}

export function subscribeUsageHours(
  onNext: (hours: number[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const dateKey = bangkokDateKey();
  return onSnapshot(
    doc(db, DAILY_STATS_COLLECTION, dateKey),
    (snapshot) => {
      onNext(hoursFromData(snapshot.data() as Record<string, unknown> | undefined));
    },
    (error) => onError?.(error),
  );
}

export function subscribeUsageMonth(
  onNext: (summary: { total: number; byDay: number[] }) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const month = bangkokDateKey().slice(0, 7);
  const days = bangkokDaysInMonth(month);
  const usageQuery = query(
    collection(db, DAILY_STATS_COLLECTION),
    where(documentId(), ">=", `${month}-01`),
    where(documentId(), "<=", `${month}-31`),
  );
  return onSnapshot(
    usageQuery,
    (snapshot) => {
      const byDay = Array.from({ length: days }, () => 0);
      let total = 0;
      for (const item of snapshot.docs) {
        const day = Number(item.id.slice(8, 10));
        const bookings = Number(item.data().totalBookings ?? 0) || 0;
        if (day >= 1 && day <= days) byDay[day - 1] = bookings;
        total += bookings;
      }
      onNext({ total, byDay });
    },
    (error) => onError?.(error),
  );
}
