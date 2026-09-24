"use client";

import { useLocale } from "@/components/AppProviders";
import { applyLocale, t } from "@/lib/i18n";

export function LanguageFlip() {
  const locale = useLocale();
  const next = locale === "th" ? "en" : "th";
  const label = locale === "th" ? t("th", "langToEn") : t("en", "langToTh");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => applyLocale(next)}
      className="lang-flip"
    >
      <span className="lang-flip-inner">
        <span className="lang-flip-face lang-flip-front">TH</span>
        <span className="lang-flip-face lang-flip-back">EN</span>
      </span>
    </button>
  );
}
