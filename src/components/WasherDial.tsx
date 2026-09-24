"use client";

import { MAX_CYCLE_MINUTES, MIN_CYCLE_MINUTES, formatCycleLabel } from "@/lib/dorms";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/AppProviders";
import { useCallback, useId, useRef, useState, type PointerEvent } from "react";

let audioCtx: AudioContext | null = null;

function tickSound() {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 420;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.stop(audioCtx.currentTime + 0.06);
  } catch {
    /* ignore */
  }
}

function minutesToAngle(minutes: number) {
  const span = MAX_CYCLE_MINUTES - MIN_CYCLE_MINUTES;
  return ((minutes - MIN_CYCLE_MINUTES) / span) * 360;
}

function angleToMinutes(angle: number) {
  const span = MAX_CYCLE_MINUTES - MIN_CYCLE_MINUTES;
  const clamped = ((angle % 360) + 360) % 360;
  return Math.round(MIN_CYCLE_MINUTES + (clamped / 360) * span);
}

function pointAngle(cx: number, cy: number, x: number, y: number) {
  const rad = Math.atan2(y - cy, x - cx);
  return ((rad * 180) / Math.PI + 90 + 360) % 360;
}

export function WasherDial({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const clipId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const lastRef = useRef(value);
  const [dragging, setDragging] = useState(false);
  const angle = minutesToAngle(value);
  const rad = ((angle - 90) * Math.PI) / 180;
  const knobX = 100 + Math.cos(rad) * 72;
  const knobY = 100 + Math.sin(rad) * 72;

  const setFromEvent = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 200;
      const y = ((event.clientY - rect.top) / rect.height) * 200;
      const next = angleToMinutes(pointAngle(100, 100, x, y));
      if (next !== lastRef.current) {
        lastRef.current = next;
        tickSound();
        onChange(next);
      }
    },
    [onChange],
  );

  return (
    <div className={`flex flex-col items-center ${dragging ? "washer-dial-drag" : "washer-dial-idle"}`}>
      <p className="mb-1 text-sm text-foreground">{t(locale, "dialHint")}</p>
      <p className="mb-2 text-lg font-semibold text-accent">{formatCycleLabel(value, locale)}</p>
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        className={`h-56 w-56 touch-none select-none ${disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
        role="slider"
        aria-label={t(locale, "dialAria")}
        aria-valuemin={MIN_CYCLE_MINUTES}
        aria-valuemax={MAX_CYCLE_MINUTES}
        aria-valuenow={value}
        aria-valuetext={formatCycleLabel(value, locale)}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(event) => {
          if (disabled) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setFromEvent(event);
        }}
        onPointerMove={(event) => {
          if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          setFromEvent(event);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onChange(Math.min(MAX_CYCLE_MINUTES, value + 1));
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onChange(Math.max(MIN_CYCLE_MINUTES, value - 1));
          }
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="100" cy="100" r="48" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="92" fill="#e2e8f0" />
        <circle cx="100" cy="100" r="84" fill="#0f172a" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="#334155" strokeWidth="10" />
        {angle > 1 && (
          <path
            d={describeArc(100, 100, 72, -90, angle - 90)}
            fill="none"
            stroke="#67e8f9"
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        <circle cx="100" cy="100" r="52" fill="#164e63" />
        <g clipPath={`url(#${clipId})`}>
          <g className="washer-drum">
            <circle cx="100" cy="100" r="46" fill="#0e7490" opacity="0.45" />
            <circle
              cx="100"
              cy="100"
              r="34"
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="3"
              strokeDasharray="8 7"
            />
          </g>
        </g>
        <circle cx={knobX} cy={knobY} r="11" fill="#67e8f9" stroke="#ecfeff" strokeWidth="2" />
        <text x="100" y="106" textAnchor="middle" fill="#ecfeff" fontSize="22" fontWeight="700">
          {value}
        </text>
      </svg>
      <p className="mt-1 text-xs text-muted">{t(locale, "dialDrag")}</p>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const sweep = ((endDeg - startDeg) % 360 + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
