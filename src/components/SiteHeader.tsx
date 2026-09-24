"use client";

import Link from "next/link";
import { ScanIcon } from "@/components/ScanIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageFlip } from "@/components/LanguageFlip";
import { useLocale } from "@/components/AppProviders";
import { t } from "@/lib/i18n";

export function SiteHeader({ connected }: { connected?: boolean }) {
  const locale = useLocale();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color:var(--header)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-[11px] tracking-[0.18em] text-accent">{"Scan&Wash"}</p>
          <p className="truncate text-lg font-semibold text-foreground" suppressHydrationWarning>
            {t(locale, "subtitle")}
          </p>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <LanguageFlip />
          <ThemeToggle />
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <ScanIcon className="h-4 w-4" />
            {t(locale, "scanQr")}
          </Link>
          <Link
            href="/board"
            className="hidden rounded-full px-4 py-2 text-muted hover:text-foreground sm:inline"
          >
            {t(locale, "board")}
          </Link>
          {connected !== undefined && (
            <span
              className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs sm:inline-flex ${
                connected ? "text-ok" : "text-warn"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-amber-300"
                }`}
              />
              {connected ? t(locale, "live") : t(locale, "connecting")}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
