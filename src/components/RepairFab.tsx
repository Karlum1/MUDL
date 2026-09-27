"use client";

import { useLocale } from "@/components/AppProviders";
import { useMachineLive } from "@/hooks/useMachineLive";
import { PUBLIC_DORM_IDS, SEED_MACHINES, dormById, type DormId } from "@/lib/dorms";
import { actionErrorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { reportMachineIssue } from "@/lib/machines";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Option = { id: string; label: string };

export function RepairFab() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { machines } = useMachineLive({
    skip: !open,
    dormIds: [...PUBLIC_DORM_IDS],
  });

  const options = useMemo<Option[]>(() => {
    const live = machines
      .filter((machine) => PUBLIC_DORM_IDS.includes(machine.dormId as DormId))
      .map((machine) => ({
        id: machine.id,
        label: `${machine.dormName} · ${machine.label}`,
      }));
    if (live.length > 0) return live;
    return SEED_MACHINES.filter((item) => PUBLIC_DORM_IDS.includes(item.dormId)).map((item) => ({
      id: item.id,
      label: `${dormById(item.dormId)?.name ?? item.dormId} · ${item.label}`,
    }));
  }, [machines]);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fromPath = pathname.match(/^\/machine\/([^/]+)/)?.[1] ?? "";
    setMachineId((current) => {
      if (current && options.some((item) => item.id === current)) return current;
      if (fromPath && options.some((item) => item.id === fromPath)) return fromPath;
      return options[0]?.id ?? "";
    });
  }, [open, pathname, options]);

  async function send() {
    if (!machineId) {
      setError(t(locale, "reportNeedMachine"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await reportMachineIssue(
        machineId,
        note.trim() || (locale === "en" ? "Broken machine" : "แจ้งเครื่องเสีย"),
      );
      setDone(true);
      setNote("");
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {!open && (
        <div className="group fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50">
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {t(locale, "reportRepair")}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t(locale, "reportRepair")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-all hover:scale-105 hover:bg-accent-hover"
          >
            <WrenchIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="repair-fab-title"
            className="w-full max-w-md rounded-3xl border border-line bg-surface p-5 shadow-lg"
          >
            <p id="repair-fab-title" className="text-sm font-semibold text-foreground">
              {t(locale, "reportRepair")}
            </p>
            {done ? (
              <p className="mt-3 text-sm text-ok">{t(locale, "reportThanks")}</p>
            ) : (
              <>
                <p className="mt-1 text-xs leading-5 text-muted">{t(locale, "reportHint")}</p>
                <label className="mt-3 block text-xs font-medium text-muted">
                  {t(locale, "reportPickMachine")}
                  <select
                    value={machineId}
                    onChange={(event) => setMachineId(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-field px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {options.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder={t(locale, "reportNotePh")}
                  className="mt-3 w-full rounded-2xl border border-line bg-field px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40"
                />
              </>
            )}
            <div className="mt-3 flex gap-2">
              {!done && (
                <button
                  type="button"
                  disabled={pending || options.length === 0}
                  onClick={() => void send()}
                  className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                >
                  {t(locale, "reportSend")}
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                {done ? t(locale, "backApp") : t(locale, "reportCancel")}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-bad">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
