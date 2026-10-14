"use client";

import { useLocale } from "@/components/AppProviders";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { t } from "@/lib/i18n";
import { isIosDevice, isStandaloneDisplay, registerWebPush } from "@/lib/session";
import { useEffect, useState, type ReactNode } from "react";

export function ScanNotifyGate({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const uid = useAnonymousSession();
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const allowed = typeof Notification !== "undefined" && Notification.permission === "granted";
    setGranted(allowed);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "denied");
    setIosHint(isIosDevice() && !isStandaloneDisplay());
    setReady(true);
  }, []);

  async function enablePush() {
    if (!uid) {
      setError(t(locale, "pushWaitSession"));
      return;
    }
    setPending(true);
    setError(null);
    const result = await registerWebPush(uid);
    const next = typeof Notification !== "undefined" ? Notification.permission : "denied";
    setPermission(next);
    setGranted(result.ok);
    if (!result.ok) setError(result.error);
    setPending(false);
  }

  if (!ready) return null;
  if (granted) return children;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-notify-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background px-4 py-8"
    >
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl">
        <h1 id="scan-notify-title" className="text-2xl font-semibold text-foreground">
          {t(locale, "scanNotifyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{t(locale, "scanNotifyBody")}</p>
        {iosHint && <p className="mt-3 text-xs leading-5 text-warn">{t(locale, "iosHint")}</p>}
        <button
          type="button"
          onClick={() => void enablePush()}
          disabled={pending}
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t(locale, "pushPending") : t(locale, "pushEnable")}
        </button>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        {permission === "denied" && <p className="mt-3 text-sm text-warn">{t(locale, "pushDenied")}</p>}
      </div>
    </div>
  );
}
