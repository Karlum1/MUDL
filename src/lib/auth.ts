import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Persistence,
  type User,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

function isQuotaError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "";
  const name =
    error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "QuotaExceededError" ||
    code.includes("quota") ||
    /quota exceeded/i.test(message)
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(code)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function persistAuth(auth: ReturnType<typeof getAuth>) {
  const modes: Persistence[] = [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ];
  for (const mode of modes) {
    try {
      await withTimeout(setPersistence(auth, mode), 2500, "AUTH_TIMEOUT");
      return;
    } catch {
      /* quota / timeout — try a lighter store */
    }
  }
}

let inFlight: Promise<User> | null = null;

export async function ensureAnonymousUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const auth = getAuth(getFirebaseApp());
  if (auth.currentUser) return auth.currentUser;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const wait = typeof window === "undefined" ? 8000 : 2500;
    await persistAuth(auth);
    try {
      await withTimeout(auth.authStateReady(), wait, "AUTH_TIMEOUT");
    } catch {
      /* continue — may still have currentUser or need a new sign-in */
    }
    if (auth.currentUser) return auth.currentUser;

    try {
      const result = await withTimeout(signInAnonymously(auth), wait, "AUTH_TIMEOUT");
      return result.user;
    } catch (error) {
      if (isQuotaError(error) || (error instanceof Error && error.message === "AUTH_TIMEOUT")) {
        try {
          await withTimeout(setPersistence(auth, inMemoryPersistence), 1500, "AUTH_TIMEOUT");
        } catch {
          /* ignore */
        }
        const retry = await withTimeout(signInAnonymously(auth), wait, "AUTH_TIMEOUT");
        return retry.user;
      }
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code.includes("operation-not-allowed") || code.includes("admin-restricted-operation")) {
        throw new Error("AUTH_DISABLED");
      }
      throw error;
    }
  })().catch((error) => {
    inFlight = null;
    throw error;
  });

  return inFlight;
}

export function subscribeAuth(listener: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    listener(null);
    return () => undefined;
  }
  const auth = getAuth(getFirebaseApp());
  return onAuthStateChanged(auth, listener);
}
