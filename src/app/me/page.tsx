"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/components/AppProviders";
import { useMachineLive } from "@/hooks/useMachineLive";
import { readClaims } from "@/lib/claimCode";
import { PUBLIC_DORM_IDS } from "@/lib/dorms";
import { t } from "@/lib/i18n";
import { listUsageByPhone, normalizeOwnerPhone, type UsageRow } from "@/lib/machines";
import { bangkokClockLabel, bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const PHONE_KEY = "wm-my-phone-v1";

export default function MyCyclesPage() {
  const locale = useLocale();
  const { machines } = useMachineLive({ dormIds: [...PUBLIC_DORM_IDS] });
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [pending, setPending] = useState(false);
  const [looked, setLooked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState(readClaims());

  useEffect(() => {
    try {
      setPhone(localStorage.getItem(PHONE_KEY) ?? "");
    } catch {
      /* ignore */
    }
    setCodes(readClaims());
  }, []);

  const normalized = normalizeOwnerPhone(phone);
  const active = machines.filter((machine) => machine.ownerPhone && machine.ownerPhone === normalized);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      localStorage.setItem(PHONE_KEY, normalized);
    } catch {
      /* quota */
    }
    try {
      setRows(await listUsageByPhone(normalized));
      setLooked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LOOKUP_FAILED");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="text-3xl font-semibold text-foreground">{t(locale, "myCycles")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t(locale, "myCyclesLead")}</p>
        <form onSubmit={(event) => void lookup(event)} className="mt-6 grid gap-3">
          <label className="text-sm font-semibold text-foreground">
            {t(locale, "myPhone")}
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              className="mt-2 w-full rounded-2xl border border-line bg-field px-4 py-3 font-normal text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <button
            type="submit"
            disabled={pending || normalized.length < 8}
            className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-fg disabled:opacity-60"
          >
            {t(locale, "myLookup")}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        {active.length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold text-foreground">{t(locale, "myActive")}</h2>
            <ul className="mt-3 space-y-2">
              {active.map((machine) => (
                <li key={machine.id}>
                  <Link href={`/machine/${machine.id}`} className="block rounded-2xl bg-chip px-4 py-3 text-sm text-foreground">
                    {machine.label} · {machine.dormName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {looked && (
          <section className="mt-8">
            {rows.length === 0 ? (
              <p className="text-sm text-muted">{t(locale, "myEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.id} className="rounded-2xl bg-chip px-4 py-3 text-sm">
                    <Link href={`/machine/${row.machineId}`} className="font-semibold text-foreground">
                      {row.machineLabel}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {row.createdAt
                        ? `${bangkokDateLabel(bangkokDateKey(new Date(row.createdAt)))} ${bangkokClockLabel(row.createdAt)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {codes.length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold text-foreground">{t(locale, "myCodes")}</h2>
            <ul className="mt-3 space-y-2">
              {codes.map((item) => (
                <li key={item.machineId} className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
                  <Link href={`/machine/${item.machineId}`} className="text-sm text-foreground">
                    {item.machineId}
                  </Link>
                  <p className="mt-1 font-mono text-xl tracking-[0.2em] text-accent">{item.secret}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
