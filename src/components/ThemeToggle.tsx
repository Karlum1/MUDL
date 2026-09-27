"use client";

import { applyPref, readPref, type ThemePref } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/AppProviders";
import { useEffect, useId, useRef, useState } from "react";

export function ThemeToggle() {
  const locale = useLocale();
  const [pref, setPref] = useState<ThemePref>("auto");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const options: { id: ThemePref; label: string }[] = [
    { id: "day", label: t(locale, "themeDay") },
    { id: "night", label: t(locale, "themeNight") },
    { id: "auto", label: t(locale, "themeAuto") },
  ];

  useEffect(() => {
    setPref(readPref());
  }, []);

  useEffect(() => {
    if (pref !== "auto") return;
    const sync = () => applyPref("auto");
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, [pref]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: ThemePref) {
    setPref(next);
    applyPref(next);
    setOpen(false);
  }

  const current = options.find((item) => item.id === pref) ?? options[2];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={current.label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-foreground hover:bg-chip"
      >
        <ThemeIcon pref={pref} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[13.5rem] overflow-visible rounded-2xl border border-line bg-surface py-1 text-[color:var(--foreground)] shadow-lg"
        >
          {options.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => choose(item.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm leading-5 ${
                pref === item.id
                  ? "bg-accent text-accent-fg"
                  : "text-[color:var(--foreground)] hover:bg-chip"
              }`}
            >
              <ThemeIcon pref={item.id} />
              <span className="whitespace-nowrap font-medium [font-family:var(--font-geist-sans),var(--font-noto-thai),sans-serif]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeIcon({ pref }: { pref: ThemePref }) {
  if (pref === "day") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" fill="none">
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
        </g>
      </svg>
    );
  }
  if (pref === "night") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M14.3 3.2a8.8 8.8 0 1 0 6.5 13.4 7.2 7.2 0 0 1-6.5-13.4Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3.2a8.8 8.8 0 1 0 0 17.6V3.2Z"
      />
      <circle cx="12" cy="12" r="8.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        fill="currentColor"
        d="M12 5.6a6.4 6.4 0 0 1 0 12.8 7 7 0 0 0 0-12.8Z"
        opacity="0.35"
      />
    </svg>
  );
}
