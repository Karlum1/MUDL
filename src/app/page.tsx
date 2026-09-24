"use client";

import { NotificationDock } from "@/components/NotificationDock";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusGrid } from "@/components/StatusGrid";
import { useLocale } from "@/components/AppProviders";
import { useMachineLive } from "@/hooks/useMachineLive";
import { PUBLIC_DORM_IDS } from "@/lib/dorms";
import { t } from "@/lib/i18n";

export default function HomePage() {
  const locale = useLocale();
  const { machines, alerts, connected, configured, error, uid } = useMachineLive({
    dormIds: [...PUBLIC_DORM_IDS],
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 lg:flex-row">
        <div className="flex-1">
          <p className="text-sm text-muted">{t(locale, "homeLead")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t(locale, "homeTitle")}
          </h1>
          {machines.length === 0 && (
            <p className="mt-3 max-w-xl text-muted">{t(locale, "waitingFirestore")}</p>
          )}

          {!configured && (
            <div className="mt-6 rounded-3xl border border-amber-400/40 bg-amber-400/15 p-5 text-sm leading-6 text-foreground">
              <p className="font-semibold">{t(locale, "firebaseMissingTitle")}</p>
              <p className="mt-2 text-muted">
                {t(locale, "firebaseMissingBody")}
              </p>
            </div>
          )}

          {configured && error && (
            <div className="mt-6 rounded-3xl border border-rose-400/40 bg-rose-400/15 p-5 text-sm text-foreground">
              {t(locale, "firestoreFail")}: {error}
            </div>
          )}

          <div className="mt-8">
            <StatusGrid machines={machines} uid={uid} />
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <NotificationDock alerts={alerts} uid={uid} />
        </div>
      </main>
    </div>
  );
}
