"use client";

import { actionErrorMessage } from "@/lib/errors";
import { machineAction } from "@/hooks/useMachineLive";
import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { WatchBell } from "@/components/WatchBell";
import { useLocale } from "@/components/AppProviders";
import { displayOwnerName } from "@/lib/machines";
import { cycleCopy, etaPhrase } from "@/lib/dorms";
import { t, statusLabel } from "@/lib/i18n";
import { STATUS_COPY } from "@/lib/status";
import type { Machine } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function MachineCard({
  machine,
  isMine = false,
  uid = null,
}: {
  machine: Machine;
  isMine?: boolean;
  uid?: string | null;
}) {
  const locale = useLocale();
  const copy = STATUS_COPY[machine.status];
  const verb = cycleCopy(machine.kind, machine.cycleMode, locale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelMine() {
    const ok = window.confirm(t(locale, "cancelConfirm"));
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      await machineAction(machine.id, "cancel");
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <article
      className={`rounded-3xl border border-line bg-surface p-5 ${copy.glow} ${
        isMine ? "ring-2 ring-accent/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {machine.dormName || machine.id.toUpperCase()}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{machine.label}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${copy.badge}`}>
          {isMine ? t(locale, "myCycle") : statusLabel(copy, locale)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <WashingMachineVisual status={machine.status} kind={machine.kind} look={machine.look} cycleMode={machine.cycleMode} />
        <div className="min-h-[72px] flex-1">
          {machine.status === "available" && (
            <p className="text-sm leading-6 text-foreground">
              {t(locale, "readyPrefix")}{verb.doing} — {t(locale, "readyScan")}
            </p>
          )}
          {machine.status === "in_use" && (
            <div className="space-y-2">
              <p className="text-sm text-accent">
                {t(locale, "usedBy")} {displayOwnerName(machine.ownerName, locale)}
              </p>
              <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} compact />
              {(machine.finishTime ?? machine.cycleEndsAt) && (
                <p className="text-xs text-muted">
                  {etaPhrase(machine.kind, machine.cycleMode, machine.finishTime ?? machine.cycleEndsAt ?? 0, locale)}
                </p>
              )}
            </div>
          )}
          {machine.status === "finished" && (
            <p className="text-sm leading-6 text-warn">
              {displayOwnerName(machine.ownerName, locale)} {verb.done}
              {machine.ownerPhone ? ` · ${t(locale, "call")} ${machine.ownerPhone}` : ""} — {t(locale, "pleaseCollect")}
            </p>
          )}
          {machine.status === "maintenance" && (
            <p className="text-sm leading-6 text-bad">
              {machine.maintenanceNote || t(locale, "closedRepair")}
            </p>
          )}
        </div>
      </div>
      {isMine && machine.status === "in_use" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/machine/${machine.id}`}
            className="text-xs text-accent hover:opacity-80"
          >
            {t(locale, "viewMine")}
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => void cancelMine()}
            className="text-xs font-medium text-bad hover:opacity-80 disabled:opacity-60"
          >
            {t(locale, "cancelCycle")}
          </button>
        </div>
      ) : isMine ? (
        <Link
          href={`/machine/${machine.id}`}
          className="mt-4 inline-block text-xs text-accent hover:opacity-80"
        >
          {t(locale, "manageMine")}
        </Link>
      ) : null}
      {machine.status !== "maintenance" && (
        <div className="mt-4">
          <WatchBell
            machineId={machine.id}
            uid={uid}
            busy={!isMine && (machine.status === "in_use" || machine.status === "finished")}
          />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </article>
  );
}
