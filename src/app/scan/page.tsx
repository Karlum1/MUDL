"use client";

import { QrScanner } from "@/components/QrScanner";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/components/AppProviders";
import { t } from "@/lib/i18n";
import { grantMachineScan } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function ScanPage() {
  const locale = useLocale();
  const router = useRouter();
  const onDetect = useCallback(
    (id: string) => {
      grantMachineScan(id);
      router.push(`/machine/${id}`);
    },
    [router],
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-foreground">{t(locale, "scanTitle")}</h1>
        <p className="mt-2 text-muted">
          {t(locale, "scanLead")}
        </p>
        <div className="mt-8">
          <QrScanner onDetect={onDetect} />
        </div>
      </main>
    </div>
  );
}
