"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { DORMS, PUBLIC_DORM_IDS, cycleCopy, etaPhrase, type DormId } from "@/lib/dorms";
import { displayOwnerName } from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import { useMachineLive } from "@/hooks/useMachineLive";
import { useLocale } from "@/components/AppProviders";
import { t, statusLabel } from "@/lib/i18n";
import type { Machine } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const DORM_PHOTO: Partial<Record<DormId, string>> = {
  int: "/dorms/int.jpg",
};

function bangkokNowLabel(now: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function MachineTile({ machine, locale }: { machine: Machine; locale: "th" | "en" }) {
  const copy = STATUS_COPY[machine.status];
  const verb = cycleCopy(machine.kind, machine.cycleMode, locale);
  const endsAt = machine.finishTime ?? machine.cycleEndsAt;
  return (
    <article className="flex min-h-36 items-center justify-between gap-4 rounded-[1.75rem] border border-line bg-surface px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <WashingMachineVisual
          status={machine.status}
          size="lg"
          kind={machine.kind}
          look={machine.look}
          cycleMode={machine.cycleMode}
        />
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold">{machine.label}</p>
          <p className="mt-1 text-base text-muted">{statusLabel(copy, locale)}</p>
          {(machine.status === "in_use" || machine.status === "finished") && (
            <p className="mt-1 truncate text-lg text-accent">
              {displayOwnerName(machine.ownerName, locale)}
            </p>
          )}
        </div>
      </div>
      {machine.status === "in_use" ? (
        <div className="shrink-0 text-right">
          <CountdownTimer endsAt={endsAt} />
          {endsAt && (
            <p className="mt-1 text-sm text-muted">
              {etaPhrase(machine.kind, machine.cycleMode, endsAt, locale)}
            </p>
          )}
        </div>
      ) : (
        machine.status === "finished" ? (
          <span
            className="material-symbols-outlined shrink-0 leading-none text-yellow-400"
            style={{ fontSize: "2.5rem", fontVariationSettings: "'FILL' 1" }}
            aria-label={verb.done}
            title={verb.done}
          >
            check_circle
          </span>
        ) : (
          <p
            className={`shrink-0 ${
              machine.status === "available"
                ? "text-4xl font-semibold text-ok"
                : "text-lg text-muted"
            }`}
          >
            {machine.status === "maintenance" ? t(locale, "closedRepair") : t(locale, "free")}
          </p>
        )
      )}
    </article>
  );
}

export default function BoardPage() {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const sawLive = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState("");
  const { machines, connected } = useMachineLive({
    dormIds: [...PUBLIC_DORM_IDS],
  });
  const visibleDorms = DORMS.filter((dorm) => machines.some((item) => item.dormId === dorm.id));
  const washers = machines.filter((item) => item.kind !== "dryer");
  const dryers = machines.filter((item) => item.kind === "dryer");

  useEffect(() => {
    const tick = () => setClock(bangkokNowLabel(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    async function stayAwake() {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* the browser may require a tap first */
      }
    }
    void stayAwake();
    const onVisible = () => {
      if (document.visibilityState === "visible") void stayAwake();
    };
    const onFull = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("fullscreenchange", onFull);
      void lock?.release();
    };
  }, []);

  useEffect(() => {
    if (connected) {
      sawLive.current = true;
      return;
    }
    if (!sawLive.current) return;
    const timer = window.setTimeout(() => window.location.reload(), 8000);
    return () => window.clearTimeout(timer);
  }, [connected]);

  async function toggleFullscreen() {
    const node = rootRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await node.requestFullscreen();
    } catch {
      /* some browsers block fullscreen without a direct gesture */
    }
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[minmax(220px,36%)_1fr] gap-8 p-4 lg:gap-12 lg:p-6">
        <aside className="relative min-h-[70vh]">
          {visibleDorms.length === 0 && (
            <div className="absolute inset-0 rounded-[2rem] bg-surface" />
          )}
          {visibleDorms.map((dorm) => {
            const photo = DORM_PHOTO[dorm.id];
            return (
              <div
                key={dorm.id}
                className="absolute inset-0 overflow-hidden rounded-[2rem] bg-slate-900"
              >
                {photo && (
                  <img
                    src={photo}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-6 pb-16 pt-6">
                  <p className="text-4xl font-semibold leading-tight text-white drop-shadow-md">
                    {dorm.name}
                  </p>
                  <p className="mt-1 text-xl text-white/90 drop-shadow-md">{dorm.halls}</p>
                </div>
              </div>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-col gap-12 pt-6 lg:gap-16 lg:pt-10">
          <div className="flex items-start justify-between gap-4">
            <p
              className="text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl lg:text-8xl"
              suppressHydrationWarning
            >
              {clock || "00:00:00"}
            </p>
            <div className="flex shrink-0 items-center gap-3 pt-3 text-sm">
              <span className={connected ? "text-ok" : "text-warn"}>
                {connected ? t(locale, "live") : t(locale, "connecting")}
              </span>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg"
              >
                {fullscreen ? t(locale, "boardExitFull") : t(locale, "boardFullscreen")}
              </button>
            </div>
          </div>

          {machines.length === 0 && (
            <p className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">
              {t(locale, "loadingMachines")}
            </p>
          )}

          <section>
            <h2 className="mb-3 text-2xl font-semibold">{t(locale, "boardWash")}</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {washers.map((machine) => (
                <MachineTile key={machine.id} machine={machine} locale={locale} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">{t(locale, "boardDry")}</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {dryers.map((machine) => (
                <MachineTile key={machine.id} machine={machine} locale={locale} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
