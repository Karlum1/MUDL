"use client";

import type { CycleMode, MachineKind, MachineLook } from "@/lib/dorms";
import type { MachineStatus } from "@/lib/types";
import { useId } from "react";

function resolveLook(kind: MachineKind, look?: MachineLook): MachineLook {
  if (look) return look;
  if (kind === "dryer") return "dryer";
  if (kind === "combo") return "combo";
  return "white";
}

export function WashingMachineVisual({
  status,
  size = "md",
  kind = "washer",
  look,
  cycleMode,
}: {
  status: MachineStatus;
  size?: "sm" | "md" | "lg";
  kind?: MachineKind;
  look?: MachineLook;
  cycleMode?: CycleMode | null;
}) {
  const clipId = useId().replace(/:/g, "");
  const resolved = resolveLook(kind, look);
  const drying = resolved === "dryer" || (resolved === "combo" && cycleMode === "dry");
  const tall = resolved === "grey";
  const dim = tall
    ? size === "lg"
      ? "h-32 w-20"
      : size === "sm"
        ? "h-20 w-12"
        : "h-28 w-16"
    : size === "lg"
      ? "h-28 w-24"
      : size === "sm"
        ? "h-16 w-14"
        : "h-24 w-20";
  const motion =
    status === "in_use"
      ? drying
        ? "dryer-hot"
        : resolved === "combo"
          ? "washer-spinning combo-run"
          : "washer-spinning"
      : status === "finished"
        ? "washer-bounce"
        : status === "maintenance"
          ? "washer-idle washer-broke"
          : "washer-idle";

  const showDryerShape = resolved === "dryer" || (resolved === "combo" && drying);

  return (
    <div className={`relative overflow-visible ${dim} look-${resolved} ${motion}`} aria-hidden>
      {showDryerShape ? (
        <DryerSvg />
      ) : resolved === "black" ? (
        <BlackWasherSvg clipId={clipId} />
      ) : resolved === "combo" ? (
        <ComboWasherSvg clipId={clipId} />
      ) : resolved === "grey" ? (
        <GreyWasherSvg clipId={clipId} />
      ) : (
        <WhiteWasherSvg clipId={clipId} />
      )}
      {status === "in_use" && drying && (
        <>
          <span className="dryer-steam pointer-events-none absolute left-3 top-1 h-3 w-2 rounded-full bg-orange-200/80" />
          <span className="dryer-steam dryer-steam-delay pointer-events-none absolute left-1/2 top-0 h-4 w-2 rounded-full bg-orange-100/90" />
          <span className="dryer-steam dryer-steam-delay-2 pointer-events-none absolute right-3 top-2 h-2.5 w-1.5 rounded-full bg-white/80" />
        </>
      )}
      {status === "finished" && (
        <span className="washer-sparkle pointer-events-none absolute -right-1 top-1 text-lg">✨</span>
      )}
      {status === "maintenance" && <BrokeParts />}
    </div>
  );
}

function CuteEyes({ y = 22, fill = "#67e8f9" }: { y?: number; fill?: string }) {
  return (
    <>
      <circle cx="28" cy={y} r="3" fill={fill} />
      <circle cx="40" cy={y} r="3" fill={fill} />
      <circle cx="29" cy={y - 1} r="1" fill="#fff" />
      <circle cx="41" cy={y - 1} r="1" fill="#fff" />
    </>
  );
}

function Drum({ clipId, cx = 40, cy = 56, tint = "#0e7490" }: { clipId: string; cx?: number; cy?: number; tint?: string }) {
  return (
    <g clipPath={`url(#${clipId})`}>
      <g className="washer-drum">
        <circle cx={cx} cy={cy} r="15" fill={tint} opacity="0.35" />
        <circle
          cx={cx}
          cy={cy}
          r="12"
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="2.2"
          strokeDasharray="5 4"
        />
        <ellipse cx={cx} cy={cy - 8} rx="4.2" ry="2.6" fill="#ecfeff" opacity="0.9" />
        <ellipse cx={cx + 7} cy={cy + 2} rx="3.2" ry="2.2" fill="#cffafe" opacity="0.85" />
      </g>
    </g>
  );
}

function WhiteWasherSvg({ clipId }: { clipId: string }) {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full drop-shadow-lg">
      <defs>
        <clipPath id={clipId}>
          <circle cx="40" cy="56" r="16" />
        </clipPath>
      </defs>
      <rect x="10" y="8" width="60" height="80" rx="16" fill="#f8fafc" />
      <rect x="16" y="14" width="48" height="12" rx="6" fill="#e2e8f0" />
      <CuteEyes y={20} fill="#38bdf8" />
      <rect x="50" y="16" width="10" height="8" rx="3" fill="#cbd5e1" />
      <circle cx="40" cy="56" r="22" fill="#e2e8f0" />
      <circle cx="40" cy="56" r="18" fill="#bae6fd" className="washer-glass" />
      <Drum clipId={clipId} />
      <circle cx="40" cy="56" r="18" fill="none" stroke="#94a3b8" strokeWidth="2" />
      <ellipse cx="40" cy="90" rx="18" ry="3" fill="rgba(15,23,42,0.28)" />
    </svg>
  );
}

function ComboWasherSvg({ clipId }: { clipId: string }) {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full drop-shadow-lg">
      <defs>
        <clipPath id={clipId}>
          <circle cx="40" cy="58" r="16" />
        </clipPath>
      </defs>
      <rect x="8" y="6" width="64" height="84" rx="12" fill="#f1f5f9" />
      <rect x="8" y="48" width="64" height="18" fill="#38bdf8" />
      <rect x="14" y="12" width="52" height="16" rx="4" fill="#0f172a" />
      <rect x="18" y="16" width="18" height="8" rx="3" fill="#22d3ee" />
      <rect x="40" y="16" width="18" height="8" rx="3" fill="#fb923c" />
      <circle cx="24" cy="36" r="3" fill="#4ade80" />
      <circle cx="34" cy="36" r="3" fill="#facc15" />
      <rect x="48" y="32" width="16" height="10" rx="2" fill="#334155" />
      <circle cx="40" cy="58" r="20" fill="#e2e8f0" />
      <circle cx="40" cy="58" r="16" fill="#7dd3fc" className="washer-glass" />
      <Drum clipId={clipId} cy={58} tint="#0284c7" />
      <circle cx="40" cy="58" r="16" fill="none" stroke="#0369a1" strokeWidth="2" />
      <ellipse cx="40" cy="92" rx="18" ry="3" fill="rgba(15,23,42,0.28)" />
    </svg>
  );
}

function BlackWasherSvg({ clipId }: { clipId: string }) {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full drop-shadow-lg">
      <defs>
        <clipPath id={clipId}>
          <circle cx="40" cy="56" r="16" />
        </clipPath>
      </defs>
      <rect x="10" y="8" width="60" height="80" rx="18" fill="#1e293b" />
      <rect x="16" y="14" width="48" height="14" rx="5" fill="#0f172a" />
      <CuteEyes y={21} fill="#22d3ee" />
      <rect x="50" y="17" width="10" height="8" rx="2" fill="#334155" />
      <circle cx="40" cy="56" r="22" fill="#020617" />
      <circle cx="40" cy="56" r="18" fill="#164e63" className="washer-glass" />
      <Drum clipId={clipId} tint="#155e75" />
      <circle cx="40" cy="56" r="18" fill="none" stroke="#64748b" strokeWidth="2" />
      <ellipse cx="40" cy="90" rx="18" ry="3" fill="rgba(15,23,42,0.45)" />
    </svg>
  );
}

function GreyWasherSvg({ clipId }: { clipId: string }) {
  return (
    <svg viewBox="0 0 72 110" className="h-full w-full drop-shadow-lg">
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="36" cy="62" rx="18" ry="10" />
        </clipPath>
      </defs>
      <rect x="12" y="8" width="48" height="92" rx="10" fill="#94a3b8" />
      <rect x="16" y="14" width="40" height="22" rx="6" fill="#64748b" />
      <circle cx="28" cy="22" r="2.4" fill="#67e8f9" />
      <circle cx="36" cy="22" r="2.4" fill="#86efac" />
      <circle cx="44" cy="22" r="2.4" fill="#fde047" />
      <ellipse cx="36" cy="48" rx="20" ry="8" fill="#cbd5e1" />
      <ellipse cx="36" cy="62" rx="18" ry="10" fill="#475569" />
      <g clipPath={`url(#${clipId})`}>
        <g className="washer-drum">
          <ellipse cx="36" cy="62" rx="10" ry="6" fill="#1e293b" />
          <rect x="34" y="54" width="4" height="16" rx="2" fill="#94a3b8" />
        </g>
      </g>
      <rect x="20" y="78" width="32" height="14" rx="4" fill="#eab308" opacity="0.9" />
      <ellipse cx="36" cy="104" rx="16" ry="3" fill="rgba(15,23,42,0.35)" />
    </svg>
  );
}

function DryerSvg() {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full drop-shadow-lg">
      <rect x="8" y="6" width="64" height="82" rx="14" className="dryer-body" fill="#f8fafc" />
      <rect x="14" y="14" width="52" height="14" rx="6" fill="#e2e8f0" />
      <CuteEyes y={21} fill="#fb923c" />
      <rect x="50" y="17" width="12" height="8" rx="3" fill="#cbd5e1" />
      <circle cx="40" cy="56" r="22" fill="#e2e8f0" />
      <circle cx="40" cy="56" r="16" className="dryer-glass" fill="#fed7aa" />
      <circle cx="40" cy="56" r="11" fill="none" stroke="#fb923c" strokeWidth="2" opacity="0.7" />
      <ellipse cx="40" cy="90" rx="18" ry="3" fill="rgba(15,23,42,0.28)" />
    </svg>
  );
}

function BrokeParts() {
  return (
    <>
      <span className="broke-part pointer-events-none absolute left-1/2 top-1/3 text-[11px]">🔩</span>
      <span className="broke-part broke-part-left pointer-events-none absolute left-1/3 top-1/2 text-[11px]">
        ⚙️
      </span>
      <span className="broke-part broke-part-down pointer-events-none absolute right-1/3 top-1/2 text-[10px]">
        🔩
      </span>
      <span
        className="broke-wrench pointer-events-none absolute -right-1 top-0 z-10 text-xl drop-shadow"
        aria-hidden
      >
        🔧
      </span>
    </>
  );
}
