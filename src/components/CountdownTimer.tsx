"use client";

import { useLocale } from "@/components/AppProviders";
import { t } from "@/lib/i18n";
import { useEffect, useId, useState } from "react";

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

export function CycleProgress({
  endsAt,
  minutes,
  compact = false,
  mode = "wash",
}: {
  endsAt: number | null;
  minutes: number | null;
  compact?: boolean;
  mode?: "wash" | "dry" | null;
}) {
  const clipId = useId().replace(/:/g, "");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endsAt || !minutes || minutes <= 0) return null;
  const total = minutes * 60 * 1000;
  const remaining = now == null ? total : Math.max(0, endsAt - now);
  const ratio = Math.min(1, Math.max(0, 1 - remaining / total));
  const percent = Math.round(ratio * 100);
  const drying = mode === "dry";
  const waterTop = 70 - Math.max(10, (percent / 100) * 56);
  const fill = drying
    ? percent >= 70
      ? "#fb923c"
      : "#fdba74"
    : percent >= 75
      ? "#67e8f9"
      : percent >= 40
        ? "#7dd3fc"
        : "#e0f2fe";
  const bubbleCount = drying ? 0 : percent < 15 ? 1 : percent < 45 ? 3 : percent < 75 ? 5 : 7;
  const bubbles = Array.from({ length: bubbleCount }, (_, index) => ({
    cx: 22 + ((index * 17) % 36),
    cy: Math.min(64, waterTop + 8 + ((index * 9) % 18)),
    r: index % 3 === 0 ? 3.2 : 2,
    delay: `${(index % 5) * 0.28}s`,
  }));

  return (
    <div
      className={`relative ${compact ? "h-20 w-20" : "h-28 w-28"}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={`${percent}%`}
    >
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <defs>
          <clipPath id={clipId}>
            <circle cx="40" cy="40" r="30" />
          </clipPath>
        </defs>
        <circle cx="40" cy="40" r="34" fill="#e2e8f0" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="80" height="80" fill={drying ? "#fff7ed" : "#f0f9ff"} />
          <g className="drum-water">
            <rect x="0" y={waterTop} width="80" height={80 - waterTop} fill={fill} />
            <ellipse className="drum-wave" cx="40" cy={waterTop} rx="38" ry="4" fill="#ffffff" opacity="0.55" />
          </g>
          {percent >= 50 && !drying && (
            <g opacity={Math.min(1, (percent - 40) / 50)}>
              <ellipse cx="30" cy={waterTop + 2} rx="8" ry="3.5" fill="#ffffff" />
              <ellipse cx="48" cy={waterTop + 1} rx="10" ry="4" fill="#ecfeff" />
              <ellipse cx="38" cy={waterTop - 2} rx="6" ry="2.5" fill="#ffffff" opacity="0.9" />
            </g>
          )}
          <g className="drum-swirl">
            <circle cx="40" cy="40" r="16" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2.2" strokeDasharray="7 9" />
            <circle cx="40" cy="40" r="8" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="3 6" />
          </g>
          {bubbles.map((bubble, index) => (
            <circle
              key={index}
              className="drum-bubble"
              cx={bubble.cx}
              cy={bubble.cy}
              r={bubble.r}
              fill="#ffffff"
              style={{ animationDelay: bubble.delay }}
            />
          ))}
        </g>
        <circle cx="40" cy="40" r="30" fill="none" stroke="#94a3b8" strokeWidth="3" />
      </svg>
      <span
        className={`pointer-events-none absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${
          compact ? "text-xs" : "text-sm"
        } ${percent > 55 ? "text-slate-950" : "text-slate-700"}`}
      >
        {percent}%
      </span>
    </div>
  );
}
