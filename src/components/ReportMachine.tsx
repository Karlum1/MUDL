"use client";

import { useLocale } from "@/components/AppProviders";
import { actionErrorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { reportMachineIssue } from "@/lib/machines";
import { useState } from "react";

export function ReportMachine({ machineId }: { machineId: string }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    try {
      await reportMachineIssue(
        machineId,
        note.trim() || (locale === "en" ? "Broken machine" : "แจ้งเครื่องเสีย"),
      );
      setDone(true);
      setOpen(false);
      setNote("");
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <p className="mt-4 text-sm text-ok">{t(locale, "reportThanks")}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-bad ring-1 ring-rose-300/40 hover:bg-rose-400/10"
      >
        {t(locale, "report")}
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-rose-300/40 bg-rose-400/10 p-4">
      <p className="text-sm font-semibold text-bad">{t(locale, "report")}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{t(locale, "reportHint")}</p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={200}
        rows={3}
        placeholder={t(locale, "reportNotePh")}
        className="mt-3 w-full rounded-2xl border border-line bg-field px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void send()}
          className="rounded-2xl bg-bad px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {t(locale, "reportSend")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded-2xl px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          {t(locale, "reportCancel")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
