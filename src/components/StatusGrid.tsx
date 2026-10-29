"use client";

import { MachineCard } from "@/components/MachineCard";
import { useLocale } from "@/components/AppProviders";
import { DORMS, PUBLIC_DORM_IDS } from "@/lib/dorms";
import { t } from "@/lib/i18n";
import type { Machine } from "@/lib/types";

export function StatusGrid({
  machines,
  uid,
  filtered = false,
}: {
  machines: Machine[];
  uid?: string | null;
  filtered?: boolean;
}) {
  const locale = useLocale();
  if (machines.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center text-muted">
        {filtered ? t(locale, "filterEmpty") : t(locale, "loadingMachines")}
      </div>
    );
  }

  const visibleDorms = DORMS.filter((dorm) => machines.some((item) => item.dormId === dorm.id)).sort(
    (a, b) => {
      const ai = PUBLIC_DORM_IDS.indexOf(a.id);
      const bi = PUBLIC_DORM_IDS.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    },
  );

  return (
    <div className="space-y-16 lg:space-y-20">
      {visibleDorms.map((dorm) => {
        const dormMachines = machines.filter((m) => m.dormId === dorm.id);
        const free = dormMachines.filter((m) => m.status === "available").length;
        return (
          <section key={dorm.id}>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              {dorm.name} ({dorm.halls})
            </h2>
            <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted">
              {t(locale, "freeOf")} {free}/{dormMachines.length}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dormMachines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  isMine={Boolean(uid && machine.ownerUid === uid)}
                  uid={uid}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
