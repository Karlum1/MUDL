"use client";

import { ensureAnonymousUser, subscribeAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { recordActiveUserOnce } from "@/lib/dailyStats";
import { useEffect, useState } from "react";

export function useAnonymousSession() {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = subscribeAuth((user) => {
      setUid(user?.uid ?? null);
    });
    void ensureAnonymousUser()
      .then((user) => {
        setUid(user.uid);
        recordActiveUserOnce();
      })
      .catch(() => undefined);
    return unsub;
  }, []);

  return uid;
}
