import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/auth";
import { MACHINE_WATCHES_COLLECTION, getFirebaseDb } from "@/lib/firebase";

export function subscribeMyWatches(
  uid: string,
  onNext: (machineIds: string[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    query(collection(db, MACHINE_WATCHES_COLLECTION), where("uid", "==", uid)),
    (snapshot) => {
      onNext(snapshot.docs.map((item) => String(item.data().machineId ?? "")).filter(Boolean));
    },
    (error) => onError?.(error),
  );
}

async function docsFor(uid: string, machineId?: string) {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, MACHINE_WATCHES_COLLECTION), where("uid", "==", uid)),
  );
  return snap.docs.filter((item) =>
    machineId ? String(item.data().machineId ?? "") === machineId : true,
  );
}

export async function watchMachine(machineId: string) {
  const user = await ensureAnonymousUser();
  const existing = await docsFor(user.uid, machineId);
  if (existing.length > 0) return;
  const db = getFirebaseDb();
  await addDoc(collection(db, MACHINE_WATCHES_COLLECTION), {
    uid: user.uid,
    machineId,
    createdAt: Timestamp.now(),
  });
}

export async function unwatchMachine(uid: string, machineId: string) {
  const existing = await docsFor(uid, machineId);
  await Promise.all(existing.map((item) => deleteDoc(item.ref)));
}
