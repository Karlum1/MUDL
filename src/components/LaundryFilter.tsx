"use client";

import { DORMS, type DormId, type MachineKind } from "@/lib/dorms";
import { t } from "@/lib/i18n";
import { useLocale } from "@/components/AppProviders";
import type { Machine } from "@/lib/types";
import { useEffect, useState } from "react";

const FILTER_KEY = "wm-view-filter-v2";
const OLD_FILTER_KEY = "wm-view-filter-v1";

const KIND_IDS: MachineKind[] = ["washer", "dryer", "combo"];

function toggleItem<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function isDormId(value: unknown): value is DormId {
  return typeof value === "string" && DORMS.some((item) => item.id === value);
}

function isKind(value: unknown): value is MachineKind {
  return value === "washer" || value === "dryer" || value === "combo";
}

export function filterMachines(machines: Machine[], dormIds: DormId[], kinds: MachineKind[]) {
  return machines.filter((machine) => {
    if (dormIds.length > 0 && !dormIds.includes(machine.dormId as DormId)) return false;
    if (kinds.length > 0 && !kinds.includes(machine.kind)) return false;
    return true;
  });
}

export function useLaundryFilter() {
  const [dormIds, setDormIds] = useState<DormId[]>([]);
  const [kinds, setKinds] = useState<MachineKind[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY) ?? sessionStorage.getItem(OLD_FILTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          dormIds?: unknown;
          kinds?: unknown;
          dormId?: unknown;
          kind?: unknown;
        };
        if (Array.isArray(parsed.dormIds)) {
          setDormIds(parsed.dormIds.filter(isDormId));
        } else if (isDormId(parsed.dormId)) {
          setDormIds([parsed.dormId]);
        }
        if (Array.isArray(parsed.kinds)) {
          setKinds(parsed.kinds.filter(isKind));
        } else if (isKind(parsed.kind)) {
          setKinds([parsed.kind]);
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ dormIds, kinds }));
    } catch {
      /* quota */
    }
  }, [dormIds, kinds, ready]);

  return {
    dormIds,
    kinds,
    toggleDorm: (id: DormId) => setDormIds((prev) => toggleItem(prev, id)),
    toggleKind: (id: MachineKind) => setKinds((prev) => toggleItem(prev, id)),
    clearDorms: () => setDormIds([]),
    clearKinds: () => setKinds([]),
    ready,
  };
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? "bg-accent text-accent-fg"
          : "bg-chip text-muted ring-1 ring-line hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function LaundryFilter({
  dormIds,
  kinds,
  onToggleDorm,
  onToggleKind,
  onClearDorms,
  onClearKinds,
}: {
  dormIds: DormId[];
  kinds: MachineKind[];
  onToggleDorm: (id: DormId) => void;
  onToggleKind: (id: MachineKind) => void;
  onClearDorms: () => void;
  onClearKinds: () => void;
}) {
  const locale = useLocale();
  const kindLabel = {
    washer: t(locale, "kindWasher"),
    dryer: t(locale, "kindDryer"),
    combo: t(locale, "kindCombo"),
  };
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">{t(locale, "dorms")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={dormIds.length === 0} onClick={onClearDorms}>
            {t(locale, "allDorms")}
          </Chip>
          {DORMS.map((dorm) => (
            <Chip
              key={dorm.id}
              active={dormIds.includes(dorm.id)}
              onClick={() => onToggleDorm(dorm.id)}
            >
              {dorm.halls}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">{t(locale, "kinds")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={kinds.length === 0} onClick={onClearKinds}>
            {t(locale, "allKinds")}
          </Chip>
          {KIND_IDS.map((id) => (
            <Chip
              key={id}
              active={kinds.includes(id)}
              onClick={() => onToggleKind(id)}
            >
              {kindLabel[id]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
