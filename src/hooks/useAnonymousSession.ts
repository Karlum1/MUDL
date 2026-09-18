"use client";

import { ensureAnonymousUser, subscribeAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { registerWebPush } from "@/lib/session";
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
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          void registerWebPush(user.uid);
        }
      })
      .catch(() => undefined);
    return unsub;
  }, []);

  return uid;
}
