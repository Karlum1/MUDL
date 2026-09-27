"use client";

import { actionErrorMessage } from "@/lib/errors";
import { machineAction } from "@/hooks/useMachineLive";
import { MAX_OWNER_NAME, MAX_OWNER_PHONE, displayOwnerName } from "@/lib/machines";
import {
  DRY_MINUTES,
  WASH_MINUTES,
  cycleCopy,
  etaPhrase,
  formatCycleLabel,
  type CycleMode,
  type MachineKind,
} from "@/lib/dorms";
import { t, statusLabel, type Locale } from "@/lib/i18n";
import { STATUS_COPY } from "@/lib/status";
import type { Machine } from "@/lib/types";
import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { WasherDial } from "@/components/WasherDial";
import { WatchBell } from "@/components/WatchBell";
import { useLocale } from "@/components/AppProviders";
import Link from "next/link";
import { useState } from "react";

export function MachineActions({
  machine,
  uid,
  scanned,
}: {
  machine: Machine;
  uid: string | null;
  scanned: boolean;
}) {
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [customWash, setCustomWash] = useState(30);
  const [customDry, setCustomDry] = useState(40);
  const copy = STATUS_COPY[machine.status];
  const verb = cycleCopy(machine.kind, machine.cycleMode, locale);
  const isMine = Boolean(uid && machine.ownerUid === uid);
  const canStart =
    scanned && (machine.status === "available" || machine.status === "reserved");

  async function run(
    action: "start" | "collect" | "cancel",
    minutes?: number | "demo",
    mode?: CycleMode,
  ) {
    if (action === "cancel") {
      const ok = window.confirm(t(locale, "cancelConfirm"));
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    try {
      if (action === "start" && !scanned) throw new Error("SCAN_REQUIRED");
      const work = machineAction(machine.id, action, minutes, ownerName, ownerPhone, mode);
      let timer = 0;
      try {
        await Promise.race([
          work,
          new Promise<never>((_, reject) => {
            timer = window.setTimeout(() => reject(new Error("START_TIMEOUT")), 8000);
          }),
        ]);
      } finally {
        window.clearTimeout(timer);
      }
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs ${copy.badge}`}>
          {statusLabel(copy, locale)}
        </span>
        {isMine && (
          <span className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
            {t(locale, "myCycle")}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <WashingMachineVisual
          status={machine.status}
          size="sm"
          kind={machine.kind}
          look={machine.look}
          cycleMode={machine.cycleMode}
        />
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{machine.label}</h1>
          <p className="mt-1 text-sm text-muted">
            {machine.dormName ? `${machine.dormName} (${machine.halls}) · ` : ""}
            {machine.id.toUpperCase()}
          </p>
        </div>
      </div>
      {machine.status === "in_use" && (
        <p className="mt-2 text-sm text-accent">
          {t(locale, "usingNow")} {displayOwnerName(machine.ownerName, locale)}
          {machine.cycleMode === "dry"
            ? ` · ${t(locale, "dry")}`
            : machine.cycleMode === "wash"
              ? ` · ${t(locale, "wash")}`
              : ""}
        </p>
      )}
      {machine.status === "finished" && (
        <p className="mt-2 text-sm text-accent">
          {t(locale, "usingNow")} {displayOwnerName(machine.ownerName, locale)}
          {machine.ownerPhone ? ` · ${t(locale, "call")} ${machine.ownerPhone}` : ""}
          {machine.cycleMode === "dry"
            ? ` · ${t(locale, "dry")}`
            : machine.cycleMode === "wash"
              ? ` · ${t(locale, "wash")}`
              : ""}
        </p>
      )}

      {machine.status === "in_use" && (
        <div className="mt-8 space-y-2">
          <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} />
          {(machine.finishTime ?? machine.cycleEndsAt) && (
            <p className="text-sm text-foreground">
              {etaPhrase(
                machine.kind,
                machine.cycleMode,
                machine.finishTime ?? machine.cycleEndsAt ?? 0,
                locale,
              )}
            </p>
          )}
        </div>
      )}

      {(machine.status === "available" || machine.status === "reserved") && !scanned && (
        <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/15 p-4 text-sm leading-6 text-warn">
          <p className="font-semibold">{t(locale, "scanOnlyTitle")}</p>
          <p className="mt-1 opacity-90">{t(locale, "scanOnlyBody")}</p>
          <Link
            href="/scan"
            className="mt-4 inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            {t(locale, "goScan")}
          </Link>
        </div>
      )}

      {canStart && (
        <div className="mt-8 grid gap-3">
          <label className="block text-sm text-foreground">
            {t(locale, "ownerName")}
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              maxLength={MAX_OWNER_NAME}
              placeholder={t(locale, "ownerNamePh")}
              className="mt-2 w-full rounded-2xl border border-line bg-field px-4 py-3 text-foreground outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
            />
          </label>
          <p className="text-xs leading-5 text-muted">
            {t(locale, "ownerNameHint")}
          </p>
          <label className="block text-sm text-foreground">
            {t(locale, "phone")}
            <input
              value={ownerPhone}
              onChange={(event) => setOwnerPhone(event.target.value)}
              maxLength={MAX_OWNER_PHONE}
              inputMode="tel"
              placeholder="0812345678"
              className="mt-2 w-full rounded-2xl border border-line bg-field px-4 py-3 text-foreground outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
            />
          </label>
          <p className="text-xs leading-5 text-muted">
            {t(locale, "phoneHint")}
          </p>

          {machine.kind === "combo" ? (
            <>
              <TimeChoices
                locale={locale}
                title={t(locale, "wash")}
                presets={[...WASH_MINUTES]}
                startLabel={t(locale, "startWash")}
                customMinutes={customWash}
                onCustomMinutes={setCustomWash}
                pending={pending}
                kind={machine.kind}
                mode="wash"
                onPreset={(minutes) => void run("start", minutes, "wash")}
                onCustom={() => void run("start", customWash, "wash")}
              />
              <TimeChoices
                locale={locale}
                title={t(locale, "dry")}
                presets={[...DRY_MINUTES]}
                startLabel={t(locale, "startDry")}
                customMinutes={customDry}
                onCustomMinutes={setCustomDry}
                pending={pending}
                kind={machine.kind}
                mode="dry"
                onPreset={(minutes) => void run("start", minutes, "dry")}
                onCustom={() => void run("start", customDry, "dry")}
              />
            </>
          ) : machine.kind === "dryer" ? (
            <TimeChoices
              locale={locale}
              presets={[...DRY_MINUTES]}
              startLabel={t(locale, "startDry")}
              customMinutes={customDry}
              onCustomMinutes={setCustomDry}
              pending={pending}
              kind={machine.kind}
              mode="dry"
              onPreset={(minutes) => void run("start", minutes, "dry")}
              onCustom={() => void run("start", customDry, "dry")}
            />
          ) : (
            <TimeChoices
              locale={locale}
              presets={[...WASH_MINUTES]}
              startLabel={t(locale, "startWash")}
              customMinutes={customWash}
              onCustomMinutes={setCustomWash}
              pending={pending}
              kind={machine.kind}
              mode="wash"
              onPreset={(minutes) => void run("start", minutes, "wash")}
              onCustom={() => void run("start", customWash, "wash")}
            />
          )}
        </div>
      )}

      {machine.status === "in_use" && isMine && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("cancel")}
          className="mt-6 w-full rounded-2xl px-4 py-4 text-base font-semibold text-bad ring-1 ring-rose-300/40 hover:bg-rose-400/10 disabled:opacity-60"
        >
          {t(locale, "cancelTime")}
        </button>
      )}

      {machine.status === "in_use" && !isMine && (
        <p className="mt-8 text-sm text-muted">{t(locale, "othersUsing")}</p>
      )}

      {(machine.status === "in_use" || machine.status === "finished") && !isMine && (
        <WatchBell machineId={machine.id} uid={uid} busy />
      )}

      {machine.status === "finished" && isMine && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("collect")}
          className="mt-8 w-full rounded-2xl bg-amber-300 px-4 py-4 text-base font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
        >
          {t(locale, "collected")}
        </button>
      )}

      {machine.status === "finished" && !isMine && (
        <p className="mt-8 text-sm text-warn">
          {t(locale, "waitingFor")} {displayOwnerName(machine.ownerName, locale)} {verb.collect}
          {machine.ownerPhone ? ` · ${t(locale, "call")} ${machine.ownerPhone}` : ""} {t(locale, "waitCollect")}
        </p>
      )}

      {machine.status === "maintenance" && (
        <p className="mt-8 text-sm text-bad">
          {machine.maintenanceNote || t(locale, "closedRepair")}
        </p>
      )}

      {error && <p className="mt-4 text-sm text-bad">{actionErrorMessage(error)}</p>}
    </div>
  );
}

function TimeChoices({
  locale,
  title,
  presets,
  startLabel,
  customMinutes,
  onCustomMinutes,
  pending,
  kind,
  mode,
  onPreset,
  onCustom,
}: {
  locale: Locale;
  title?: string;
  presets: number[];
  startLabel: string;
  customMinutes: number;
  onCustomMinutes: (minutes: number) => void;
  pending: boolean;
  kind: MachineKind;
  mode: CycleMode;
  onPreset: (minutes: number) => void;
  onCustom: () => void;
}) {
  const preview = etaPhrase(kind, mode, Date.now() + customMinutes * 60 * 1000, locale);
  return (
    <div className="rounded-3xl border border-line bg-field p-4">
      {title && <p className="mb-3 text-sm font-semibold text-accent">{title}</p>}
      <div className="grid gap-2">
        {presets.map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={pending}
            onClick={() => onPreset(minutes)}
            className="rounded-2xl bg-chip px-4 py-3 text-sm font-semibold text-foreground ring-1 ring-line hover:opacity-90 disabled:opacity-60"
          >
            {startLabel} {formatCycleLabel(minutes, locale)}
            <span className="mt-1 block text-xs font-normal opacity-80">
              {etaPhrase(kind, mode, Date.now() + minutes * 60 * 1000, locale)}
            </span>
          </button>
        ))}
        <div className="mt-2">
          <WasherDial value={customMinutes} onChange={onCustomMinutes} disabled={pending} />
          <p className="mt-2 text-center text-sm text-accent">{preview}</p>
          <button
            type="button"
            disabled={pending}
            onClick={onCustom}
            className="mt-3 w-full rounded-2xl bg-accent px-4 py-4 text-base font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
          >
            {startLabel} {formatCycleLabel(customMinutes, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
