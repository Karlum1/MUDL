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
  const { machines, connected, configured, error, uid } = useMachineLive({
    dormIds: [...PUBLIC_DORM_IDS],
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="lg:col-start-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t(locale, "homeTitle")}
          </h1>
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <NotificationDock uid={uid} />
        </div>
        <div className="lg:col-start-1">
          {machines.length === 0 && (
            <p className="max-w-xl text-muted">{t(locale, "waitingFirestore")}</p>
          )}

          {!configured && (
            <div className="rounded-3xl border border-amber-400/40 bg-amber-400/15 p-5 text-sm leading-6 text-foreground">
              <p className="font-semibold">{t(locale, "firebaseMissingTitle")}</p>
              <p className="mt-2 text-muted">
                {t(locale, "firebaseMissingBody")}
              </p>
            </div>
          )}

          {configured && error === "OFFLINE_STALE" && (
            <div className="rounded-3xl border border-amber-400/40 bg-amber-400/15 p-5 text-sm text-foreground">
              {t(locale, "offlineStale")}
            </div>
          )}
          {configured && error && error !== "OFFLINE_STALE" && (
            <div className="rounded-3xl border border-rose-400/40 bg-rose-400/15 p-5 text-sm text-foreground">
              {t(locale, "firestoreFail")}: {error}
            </div>
          )}

          <div className={machines.length === 0 || !configured || error ? "mt-8" : undefined}>
            <StatusGrid machines={machines} uid={uid} />
          </div>
        </div>
      </main>
    </div>
  );
}
