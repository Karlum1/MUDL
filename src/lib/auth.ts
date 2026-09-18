import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

export async function ensureAnonymousUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const auth = getAuth(getFirebaseApp());
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export function subscribeAuth(listener: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    listener(null);
    return () => undefined;
  }
  const auth = getAuth(getFirebaseApp());
  return onAuthStateChanged(auth, listener);
}
