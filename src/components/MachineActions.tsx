"use client";

import { actionErrorMessage } from "@/lib/errors";
import { machineAction, machineActionWithCode } from "@/hooks/useMachineLive";
import { readClaim } from "@/lib/claimCode";
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
import { CountdownTimer, CycleProgress } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { WasherDial } from "@/components/WasherDial";
import { WatchBell } from "@/components/WatchBell";
import { useLocale } from "@/components/AppProviders";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareFinishAlert } from "@/lib/session";

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
  const router = useRouter();
  const [alertsOn, setAlertsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [customWash, setCustomWash] = useState(30);
  const [customDry, setCustomDry] = useState(40);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [typedCode, setTypedCode] = useState("");
  const [fizz, setFizz] = useState(false);
  const [fizzDry, setFizzDry] = useState(false);
  const copy = STATUS_COPY[machine.status];
  const verb = cycleCopy(machine.kind, machine.cycleMode, locale);
  const isOwner = Boolean(uid && machine.ownerUid === uid);
  const isMine = isOwner || Boolean(claimCode);
  const canStart = scanned && machine.status === "available";

  useEffect(() => {
    setClaimCode(readClaim(machine.id)?.secret ?? null);
  }, [machine.id, machine.status]);

  useEffect(() => {
    setAlertsOn(typeof Notification !== "undefined" && Notification.permission === "granted");
  }, [machine.status]);

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
      const useCode = Boolean(claimCode) && !isOwner && action !== "start";
      const work = useCode
        ? machineActionWithCode(machine.id, action, claimCode ?? "")
        : machineAction(machine.id, action, minutes, ownerName, ownerPhone, mode);
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
      if (action === "start") {
        setClaimCode(readClaim(machine.id)?.secret ?? null);
        setFizzDry(mode === "dry");
        setFizz(true);
        if (typeof navigator.vibrate === "function") navigator.vibrate(50);
        window.setTimeout(() => {
          setFizz(false);
          if (mode !== "dry") router.push("/");
        }, 1800);
      }
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      {fizz && <FizzSplash dry={fizzDry} />}
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
        <div className="mt-8 space-y-3">
          <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} />
          <CycleProgress
            endsAt={machine.finishTime ?? machine.cycleEndsAt}
            minutes={machine.cycleMinutes}
            mode={machine.cycleMode}
          />
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
          {isMine && (
            <p className="text-sm text-accent">{t(locale, alertsOn ? "pushOn" : "alertOff")}</p>
          )}
        </div>
      )}

      {machine.status === "available" && !scanned && (
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

      {claimCode && (machine.status === "in_use" || machine.status === "finished") && (
        <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-foreground">{t(locale, "claimTitle")}</p>
          <p className="mt-1 font-mono text-2xl tracking-[0.2em] text-accent">{claimCode}</p>
          <p className="mt-2 text-sm leading-6 text-foreground">{t(locale, "claimBody")}</p>
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
        <div className="mt-8">
          <p className="text-sm text-warn">
            {t(locale, "waitingFor")} {displayOwnerName(machine.ownerName, locale)} {verb.collect}
            {machine.ownerPhone ? ` · ${t(locale, "call")} ${machine.ownerPhone}` : ""} {t(locale, "waitCollect")}
          </p>
          <form
            className="mt-4 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                setPending(true);
                setError(null);
                try {
                  await machineActionWithCode(machine.id, "collect", typedCode);
                  setTypedCode("");
                } catch (err) {
                  setError(actionErrorMessage(err));
                } finally {
                  setPending(false);
                }
              })();
            }}
          >
            <label className="text-sm font-semibold text-foreground">
              {t(locale, "collectWithCode")}
              <input
                value={typedCode}
                onChange={(event) => setTypedCode(event.target.value)}
                placeholder={t(locale, "claimPlaceholder")}
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-line bg-field px-4 py-3 font-mono tracking-widest text-foreground outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
            <button
              type="submit"
              disabled={pending || typedCode.trim().length < 8}
              className="rounded-2xl bg-amber-300 px-4 py-4 text-base font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
            >
              {t(locale, "collected")}
            </button>
          </form>
        </div>
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

function FizzSplash({ dry }: { dry: boolean }) {
  const bubbles = [
    { left: "6%", size: 16, delay: "0ms", dur: "1.6s" },
    { left: "14%", size: 28, delay: "80ms", dur: "1.9s" },
    { left: "22%", size: 12, delay: "160ms", dur: "1.5s" },
    { left: "31%", size: 22, delay: "40ms", dur: "1.8s" },
    { left: "40%", size: 10, delay: "220ms", dur: "1.55s" },
    { left: "48%", size: 34, delay: "120ms", dur: "1.95s" },
    { left: "57%", size: 14, delay: "200ms", dur: "1.65s" },
    { left: "66%", size: 24, delay: "60ms", dur: "1.75s" },
    { left: "74%", size: 11, delay: "260ms", dur: "1.5s" },
    { left: "82%", size: 20, delay: "140ms", dur: "1.85s" },
    { left: "90%", size: 15, delay: "30ms", dur: "1.7s" },
    { left: "18%", size: 18, delay: "300ms", dur: "1.6s" },
    { left: "52%", size: 26, delay: "180ms", dur: "1.9s" },
    { left: "70%", size: 13, delay: "90ms", dur: "1.55s" },
  ];
  const sparks = [
    { left: "8%", size: 7, delay: "0ms", dur: "1.45s", drift: "14px", tone: "" },
    { left: "16%", size: 12, delay: "40ms", dur: "1.8s", drift: "-18px", tone: "launch-spark-gold" },
    { left: "24%", size: 5, delay: "120ms", dur: "1.55s", drift: "10px", tone: "launch-spark-red" },
    { left: "33%", size: 10, delay: "20ms", dur: "1.7s", drift: "-12px", tone: "" },
    { left: "41%", size: 6, delay: "180ms", dur: "1.5s", drift: "16px", tone: "launch-spark-gold" },
    { left: "49%", size: 14, delay: "70ms", dur: "1.9s", drift: "-8px", tone: "" },
    { left: "56%", size: 5, delay: "210ms", dur: "1.6s", drift: "12px", tone: "launch-spark-red" },
    { left: "63%", size: 9, delay: "30ms", dur: "1.75s", drift: "-20px", tone: "launch-spark-gold" },
    { left: "71%", size: 7, delay: "150ms", dur: "1.5s", drift: "9px", tone: "" },
    { left: "78%", size: 11, delay: "90ms", dur: "1.85s", drift: "-14px", tone: "launch-spark-red" },
    { left: "86%", size: 6, delay: "10ms", dur: "1.65s", drift: "18px", tone: "launch-spark-gold" },
    { left: "93%", size: 8, delay: "200ms", dur: "1.55s", drift: "-10px", tone: "" },
    { left: "12%", size: 4, delay: "260ms", dur: "1.4s", drift: "-16px", tone: "launch-spark-red" },
    { left: "28%", size: 13, delay: "100ms", dur: "1.85s", drift: "8px", tone: "launch-spark-gold" },
    { left: "45%", size: 5, delay: "240ms", dur: "1.5s", drift: "-11px", tone: "" },
    { left: "60%", size: 8, delay: "60ms", dur: "1.7s", drift: "15px", tone: "launch-spark-gold" },
    { left: "74%", size: 4, delay: "190ms", dur: "1.45s", drift: "-7px", tone: "launch-spark-red" },
    { left: "88%", size: 10, delay: "130ms", dur: "1.8s", drift: "11px", tone: "" },
  ];
  const pieces = dry ? sparks : bubbles;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden bg-background/35" aria-hidden>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={dry ? `launch-spark ${"tone" in piece ? piece.tone : ""}` : "launch-bubble"}
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size,
            animationDelay: piece.delay,
            animationDuration: piece.dur,
            ...(dry && "drift" in piece ? { ["--drift" as string]: piece.drift } : {}),
          }}
        />
      ))}
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
