"use client";

import { useLocale } from "@/components/AppProviders";
import { t } from "@/lib/i18n";
import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({
  endsAt,
  compact = false,
}: {
  endsAt: number | null;
  compact?: boolean;
}) {
  const locale = useLocale();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return null;
  const remaining = now == null ? 0 : endsAt - now;
  const done = now != null && remaining <= 0;

  return (
    <p
      className={`font-mono tracking-tight tabular-nums ${
        compact ? "text-2xl" : "text-4xl"
      } ${done ? "text-warn" : "text-accent"}`}
      suppressHydrationWarning
    >
      {now == null ? "--:--" : done ? "00:00" : formatRemaining(remaining)}
      <span className="ml-2 text-sm font-sans tracking-normal text-muted">
        {done ? t(locale, "done") : t(locale, "remaining")}
      </span>
    </p>
  );
}
