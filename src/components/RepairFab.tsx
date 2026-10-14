"use client";

import { useLocale } from "@/components/AppProviders";
import { actionErrorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { reportAppBug } from "@/lib/machines";
import { useEffect, useState } from "react";

export function RepairFab() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
  }, [open]);

  async function send() {
    if (!note.trim()) {
      setError(t(locale, "reportNeedNote"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await reportAppBug(note);
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
            <span aria-hidden className="material-symbols-outlined text-[28px] leading-none">
              error
            </span>
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
                <label className="mt-4 block text-sm font-semibold text-foreground">
                  {t(locale, "reportDetail")}
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={200}
                    rows={4}
                    placeholder={t(locale, "reportNotePh")}
                    className="mt-2 w-full rounded-2xl border border-line bg-field px-3 py-2 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </label>
              </>
            )}
            <div className="mt-3 flex gap-2">
              {!done && (
                <button
                  type="button"
                  disabled={pending}
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
