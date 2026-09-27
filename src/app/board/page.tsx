"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { DORMS, PUBLIC_DORM_IDS, cycleCopy, etaPhrase } from "@/lib/dorms";
import { displayOwnerName } from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import { bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import { useMachineLive } from "@/hooks/useMachineLive";
import { RepairFab } from "@/components/RepairFab";
import { LanguageFlip } from "@/components/LanguageFlip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocale } from "@/components/AppProviders";
import { t, statusLabel } from "@/lib/i18n";
import Link from "next/link";

export default function BoardPage() {
  const locale = useLocale();
  const { machines, connected } = useMachineLive({
    dormIds: [...PUBLIC_DORM_IDS],
  });
  const dateKey = bangkokDateKey();
  const visibleDorms = DORMS.filter((dorm) => machines.some((item) => item.dormId === dorm.id));

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-accent">{"Scan&Wash"}</p>
          <h1 className="text-2xl font-semibold">{t(locale, "boardTitle")} · {bangkokDateLabel(dateKey)}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <LanguageFlip />
          <ThemeToggle />
          <span className={connected ? "text-ok" : "text-warn"}>
            {connected ? t(locale, "live") : t(locale, "connecting")}
          </span>
          <Link href="/" className="text-muted hover:text-foreground">
            {t(locale, "backApp")}
          </Link>
        </div>
      </header>

      <main className="space-y-8 px-6 pb-8">
        {visibleDorms.length === 0 && (
          <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">
            {t(locale, "loadingMachines")}
          </p>
        )}
        {visibleDorms.map((dorm) => {
          const dormMachines = machines.filter((item) => item.dormId === dorm.id);
          return (
            <section key={dorm.id}>
              <h2 className="mb-3 text-lg font-semibold">
                {dorm.name}{" "}
                <span className="text-sm font-normal text-muted">{dorm.halls}</span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {dormMachines.map((machine) => {
                  const copy = STATUS_COPY[machine.status];
                  const verb = cycleCopy(machine.kind, machine.cycleMode, locale);
                  const endsAt = machine.finishTime ?? machine.cycleEndsAt;
                  return (
                    <article
                      key={machine.id}
                      className="rounded-3xl border border-line bg-surface px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <WashingMachineVisual
                            status={machine.status}
                            size="sm"
                            kind={machine.kind}
                            look={machine.look}
                            cycleMode={machine.cycleMode}
                          />
                          <div>
                            <p className="font-semibold">{machine.label}</p>
                            <p className="text-xs text-muted">{statusLabel(copy, locale)}</p>
                            {machine.status === "in_use" && (
                              <p className="mt-1 text-sm text-accent">
                                {displayOwnerName(machine.ownerName, locale)}
                              </p>
                            )}
                            {machine.status === "finished" && (
                              <p className="mt-1 text-sm text-accent">
                                {displayOwnerName(machine.ownerName, locale)}
                                {machine.ownerPhone ? ` · ${machine.ownerPhone}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        {machine.status === "in_use" ? (
                          <div className="text-right">
                            <CountdownTimer endsAt={endsAt} compact />
                            {endsAt && (
                              <p className="mt-1 text-xs text-muted">
                                {etaPhrase(machine.kind, machine.cycleMode, endsAt, locale)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted">
                            {machine.status === "finished"
                              ? verb.done
                              : machine.status === "maintenance"
                                ? t(locale, "closedRepair")
                                : t(locale, "free")}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
      <RepairFab />
    </div>
  );
}
