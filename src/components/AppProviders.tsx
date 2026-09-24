"use client";

import { readLocale, type Locale } from "@/lib/i18n";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const LocaleContext = createContext<Locale>("th");

export function AppProviders({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("th");

  useEffect(() => {
    setLocale(readLocale());
    const root = document.documentElement;
    const sync = () => setLocale(readLocale());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-locale"] });
    return () => observer.disconnect();
  }, []);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
