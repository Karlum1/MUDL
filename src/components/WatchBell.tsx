"use client";

import { useLocale } from "@/components/AppProviders";
import { actionErrorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { subscribeMyWatches, unwatchMachine, watchMachine } from "@/lib/watches";
import { useEffect, useState } from "react";

export function WatchBell({
  machineId,
  uid,
  busy,
}: {
  machineId: string;
  uid: string | null;
  busy: boolean;
}) {
  const locale = useLocale();
  const [watching, setWatching] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeMyWatches(uid, (ids) => setWatching(ids.includes(machineId)));
  }, [uid, machineId]);

  if (!busy || !uid) return null;

  async function toggle() {
    if (!uid) return;
    setPending(true);
    setError(null);
    try {
      if (watching) await unwatchMachine(uid, machineId);
      else await watchMachine(machineId);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => void toggle()}
        aria-pressed={watching}
        aria-label={watching ? t(locale, "watching") : t(locale, "watch")}
        title={t(locale, "watchHint")}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 disabled:opacity-60 ${
          watching
            ? "bg-accent text-accent-fg ring-accent"
            : "bg-chip text-foreground ring-line hover:opacity-90"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="currentColor"
            d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm7-6.2V11a7 7 0 1 0-14 0v4.8L3 17.6V19h18v-1.4l-2-1.8Z"
          />
        </svg>
        {watching ? t(locale, "watching") : t(locale, "watch")}
      </button>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
