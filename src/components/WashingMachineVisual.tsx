"use client";

import type { MachineStatus } from "@/lib/types";
import { useId } from "react";

export function WashingMachineVisual({
  status,
  size = "md",
}: {
  status: MachineStatus;
  size?: "sm" | "md" | "lg";
}) {
  const clipId = useId().replace(/:/g, "");
  const dim = size === "lg" ? "h-28 w-24" : size === "sm" ? "h-16 w-14" : "h-24 w-20";
  const motion =
    status === "in_use"
      ? "washer-spinning"
      : status === "finished"
        ? "washer-bounce"
        : status === "maintenance"
          ? "washer-sad"
          : "washer-idle";

  return (
    <div className={`relative ${dim} ${motion}`} aria-hidden>
      <svg viewBox="0 0 80 96" className="h-full w-full drop-shadow-lg">
        <defs>
          <clipPath id={clipId}>
            <circle cx="40" cy="56" r="16" />
          </clipPath>
        </defs>
        <rect x="8" y="6" width="64" height="82" rx="14" fill="#e8f4ff" />
        <rect x="12" y="10" width="56" height="74" rx="11" fill="#1e293b" />
        <circle cx="24" cy="22" r="3.2" fill="#67e8f9" />
        <circle cx="34" cy="22" r="3.2" fill="#86efac" />
        <circle cx="44" cy="22" r="3.2" fill="#fde047" />
        <rect x="52" y="18" width="12" height="8" rx="3" fill="#334155" />
        <circle cx="40" cy="56" r="22" fill="#0f172a" />
        <circle cx="40" cy="56" r="18" fill="#164e63" className="washer-glass" />
        <g clipPath={`url(#${clipId})`}>
          <g className="washer-drum">
            <circle cx="40" cy="56" r="15" fill="#0e7490" opacity="0.35" />
            <circle
              cx="40"
              cy="56"
              r="12"
              fill="none"
              stroke="#67e8f9"
              strokeWidth="2.2"
              strokeDasharray="5 4"
            />
            <ellipse cx="40" cy="48" rx="4.2" ry="2.6" fill="#a5f3fc" opacity="0.9" />
            <ellipse cx="47" cy="58" rx="3.2" ry="2.2" fill="#cffafe" opacity="0.85" />
            <ellipse cx="34" cy="61" rx="2.8" ry="2" fill="#ecfeff" opacity="0.8" />
          </g>
        </g>
        <circle cx="40" cy="56" r="18" fill="none" stroke="#94a3b8" strokeWidth="1.4" opacity="0.55" />
        <ellipse cx="40" cy="90" rx="18" ry="3" fill="rgba(15,23,42,0.35)" />
      </svg>
      {status === "finished" && (
        <span className="washer-sparkle pointer-events-none absolute -right-1 top-1 text-lg">✨</span>
      )}
    </div>
  );
}
