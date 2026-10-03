import { bangkokDateKey, bangkokDaysInMonth, bangkokHour, bangkokMonthKey } from "@/lib/day";
import { dormById, seedForId, type DormId } from "@/lib/dorms";
import { DAILY_STATS_COLLECTION, USAGE_EVENTS_COLLECTION, getFirebaseDb } from "@/lib/firebase";
import {
  Timestamp,
  collection,
  doc,
  documentId,
  increment,
  onSnapshot,
  orderBy,
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

export type UsageHit = {
  id: string;
  day: number;
  dormId: string;
  ownerName: string;
};

const DORM_IDS = new Set(["sri", "lee", "int", "chai", "kan"]);

function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(`${monthKey}-01T00:00:00+07:00`);
  const next =
    month === 12
      ? `${year + 1}-01-01T00:00:00+07:00`
      : `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+07:00`;
  return { start, end: new Date(next) };
}

function dormFromEvent(data: Record<string, unknown>) {
  const stored = typeof data.dormId === "string" ? data.dormId : "";
  if (DORM_IDS.has(stored)) return stored;
  const machineId = typeof data.machineId === "string" ? data.machineId : "";
  const seed = seedForId(machineId);
  if (seed) return seed.dormId;
  const prefix = machineId.split("-")[0] ?? "";
  return DORM_IDS.has(prefix) ? prefix : "other";
}

export function subscribeUsageHits(
  onNext: (hits: UsageHit[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const month = bangkokMonthKey();
  const { start, end } = monthBounds(month);
  const days = bangkokDaysInMonth(month);
  const usageQuery = query(
    collection(db, USAGE_EVENTS_COLLECTION),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    usageQuery,
    (snapshot) => {
      const hits: UsageHit[] = [];
      for (const item of snapshot.docs) {
        const data = item.data() as Record<string, unknown>;
        const created = data.createdAt;
        const at =
          created instanceof Timestamp
            ? created.toMillis()
            : typeof created === "number"
              ? created
              : 0;
        if (!at) continue;
        const day = Number(bangkokDateKey(new Date(at)).slice(8, 10));
        if (day < 1 || day > days) continue;
        const rawName = typeof data.ownerName === "string" ? data.ownerName.trim() : "";
        hits.push({
          id: item.id,
          day,
          dormId: dormFromEvent(data),
          ownerName: rawName || "ไม่ระบุตัวตน",
        });
      }
      onNext(hits);
    },
    (error) => onError?.(error),
  );
}

export function dormLabel(dormId: string) {
  if (dormId === "other") return "ไม่ระบุหอ";
  const dorm = dormById(dormId as DormId);
  return dorm ? `${dorm.name} (${dorm.halls})` : dormId;
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
