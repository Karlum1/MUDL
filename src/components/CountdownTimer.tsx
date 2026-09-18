"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({
  endsAt,
  compact = false,
}: {
  endsAt: number | null;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return null;
  const remaining = endsAt - now;
  const done = remaining <= 0;

  return (
    <p
      className={`font-mono tracking-tight tabular-nums ${
        compact ? "text-2xl" : "text-4xl"
      } ${done ? "text-amber-300" : "text-cyan-100"}`}
    >
      {done ? "00:00" : formatRemaining(remaining)}
      <span className="ml-2 text-sm font-sans tracking-normal text-slate-400">
        {done ? "เสร็จแล้ว" : "เหลือเวลา"}
      </span>
    </p>
  );
}
