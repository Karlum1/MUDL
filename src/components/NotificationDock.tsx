"use client";

import { subscribeAnnouncements } from "@/lib/machines";
import { isIosDevice, isStandaloneDisplay, registerWebPush } from "@/lib/session";
import { isSfxOn, setSfxOn } from "@/lib/sfx";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/AppProviders";
import type { AlertEvent, Announcement } from "@/lib/types";
import { useEffect, useState } from "react";

export function NotificationDock({
  alerts,
  uid,
}: {
  alerts: AlertEvent[];
  uid: string | null;
}) {
  const locale = useLocale();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sfxOn, setSfx] = useState(true);
  const [ringTick, setRingTick] = useState(0);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
    setIosHint(isIosDevice() && !isStandaloneDisplay());
    setSfx(isSfxOn());
  }, []);

  useEffect(() => {
    if (!uid || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    void registerWebPush(uid).then((result) => {
      if (result.ok) setEnabled(true);
    });
  }, [uid]);

  useEffect(() => {
    return subscribeAnnouncements(setAnnouncements, () => undefined);
  }, []);

  async function enablePush() {
    if (!uid) {
      setError(t(locale, "pushWaitSession"));
      return;
    }
    setPending(true);
    setError(null);
    const result = await registerWebPush(uid);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
    setEnabled(result.ok);
    if (result.ok) setRingTick((tick) => tick + 1);
    if (!result.ok) setError(result.error);
    setPending(false);
  }

  const latest = alerts.slice(0, 3);

  return (
    <aside className="space-y-3">
      {announcements[0] && (
        <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-warn">{t(locale, "news")}</p>
          <p className="mt-2 text-sm leading-6 text-foreground">{announcements[0].messageTh}</p>
        </div>
      )}

      <div className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">{t(locale, "pushTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t(locale, "pushBody")}
        </p>
        {iosHint && (
          <p className="mt-3 text-xs leading-5 text-warn">
            {t(locale, "iosHint")}
          </p>
        )}
        <button
          type="button"
          onClick={() => void enablePush()}
          disabled={pending}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
            enabled
              ? "bg-accent text-accent-fg hover:bg-accent-hover"
              : "bg-chip text-foreground ring-1 ring-line hover:bg-surface"
          }`}
        >
          <NotifyBell on={enabled} play={ringTick} />
          {enabled ? t(locale, "pushOn") : pending ? t(locale, "pushPending") : t(locale, "pushEnable")}
        </button>
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
        {permission === "denied" && (
          <p className="mt-2 text-xs text-warn">
            {t(locale, "pushDenied")}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            const next = !sfxOn;
            setSfxOn(next);
            setSfx(next);
          }}
          className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-foreground ring-1 ring-line hover:bg-chip"
        >
          {sfxOn ? t(locale, "sfxOn") : t(locale, "sfxOff")}
        </button>
      </div>

      <div className="space-y-2">
        {latest.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {t(locale, "noAlerts")}
          </p>
        )}
        {latest.map((alert) => (
          <article
            key={alert.id}
            className="rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <p className="text-sm font-medium text-foreground">
              {locale === "en" ? alert.messageEn : alert.messageTh}
            </p>
            <p className="mt-1 text-xs text-muted">
              {locale === "en" ? alert.messageTh : alert.messageEn}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function NotifyBell({ on, play }: { on: boolean; play: number }) {
  return (
    <svg
      key={play}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${on ? "text-accent-fg" : "text-muted"} ${play > 0 ? "bell-wiggle" : ""}`}
    >
      <path
        d="M10.27 21a2 2 0 0 0 3.46 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {on && (
        <>
          <path
            d="M4 2C2.8 3.7 2 5.7 2 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M22 8c0-2.3-.8-4.3-2-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
