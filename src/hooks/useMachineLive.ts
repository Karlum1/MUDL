"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import {
  cancelCycle,
  collectClothes,
  markAlmostAlertSent,
  markMachineFinished,
  seedMachinesIfEmpty,
  startMachine,
  subscribeMachines,
  type MachinesQuery,
} from "@/lib/machines";
import type { AlertEvent, Machine } from "@/lib/types";
import { remainingCycleMinutes } from "@/lib/cycleTiming";
import { playFinishRingtone, unlockSfx } from "@/lib/sfx";
import { readLocale } from "@/lib/i18n";
import { subscribeMyWatches } from "@/lib/watches";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LiveState = {
  machines: Machine[];
  alerts: AlertEvent[];
  connected: boolean;
  configured: boolean;
  error: string | null;
};

type LiveContext = LiveState & {
  uid: string | null;
  setInterest: (key: string, query: MachinesQuery | null) => void;
};

const MachineLiveContext = createContext<LiveContext | null>(null);

function pushLocalAlert(
  prev: AlertEvent[],
  kind: AlertEvent["kind"],
  messageTh: string,
  messageEn: string,
  machineId = "",
): AlertEvent[] {
  const alert: AlertEvent = {
    id: `${kind}-${machineId}-${Date.now()}`,
    kind,
    machineId,
    createdAt: Date.now(),
    messageTh,
    messageEn,
  };
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const locale = readLocale();
    const title = locale === "en" ? messageEn : messageTh;
    const body = locale === "en" ? messageTh : messageEn;
    new Notification(title, { body, tag: `${kind}-${machineId}` });
  }
  return [alert, ...prev].slice(0, 40);
}

function mergeInterests(list: MachinesQuery[]): MachinesQuery | null {
  if (list.length === 0) return null;
  if (list.some((item) => item.all)) return { all: true };
  const dormIds = [...new Set(list.flatMap((item) => item.dormIds ?? []).filter(Boolean))];
  const machineIds = [...new Set(list.map((item) => item.machineId).filter(Boolean))] as string[];
  if (dormIds.length > 0) return { dormIds };
  if (machineIds.length === 1) return { machineId: machineIds[0] };
  if (machineIds.length > 1) return { all: true };
  return { all: true };
}

export function MachineLiveProvider({ children }: { children: ReactNode }) {
  const uid = useAnonymousSession();
  const [state, setState] = useState<LiveState>({
    machines: [],
    alerts: [],
    connected: false,
    configured: isFirebaseConfigured(),
    error: isFirebaseConfigured() ? null : "FIREBASE_NOT_CONFIGURED",
  });
  const prevRef = useRef<Map<string, Machine>>(new Map());
  const finishing = useRef(new Set<string>());
  const alerted = useRef(new Set<string>());
  const watchesRef = useRef(new Set<string>());
  const interestsRef = useRef(new Map<string, MachinesQuery>());
  const [scopeKey, setScopeKey] = useState("idle");

  const setInterest = useCallback((key: string, query: MachinesQuery | null) => {
    if (!query) interestsRef.current.delete(key);
    else interestsRef.current.set(key, query);
    const merged = mergeInterests([...interestsRef.current.values()]);
    setScopeKey(merged ? JSON.stringify(merged) : "idle");
  }, []);

  useEffect(() => {
    const unlock = () => unlockSfx();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!uid) return;
    return subscribeMyWatches(uid, (ids) => {
      watchesRef.current = new Set(ids);
    });
  }, [uid]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid || scopeKey === "idle") return;
    let scope: MachinesQuery = { all: true };
    try {
      scope = JSON.parse(scopeKey) as MachinesQuery;
    } catch {
      scope = { all: true };
    }

    let unsubMachines: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        try {
          await seedMachinesIfEmpty();
        } catch {
          /* rules ยังไม่ให้สร้างเครื่องหอใหม่ — ยังโหลดเครื่องที่มีอยู่ได้ */
        }
        if (cancelled) return;
        unsubMachines = subscribeMachines(
          (machines) => {
            setState((prev) => {
              let alerts = prev.alerts;
              const previous = prevRef.current;
              for (const machine of machines) {
                const before = previous.get(machine.id);
                if (before?.status === "in_use" && machine.status === "finished") {
                  const key = `${machine.id}-finished-${machine.finishTime}`;
                  if (!alerted.current.has(key)) {
                    alerted.current.add(key);
                    alerts = pushLocalAlert(
                      alerts,
                      "finished",
                      `${machine.label} ซักเสร็จแล้ว แต่ยังไม่ได้เอาผ้าออก`,
                      `${machine.label} finished — clothes not collected yet`,
                      machine.id,
                    );
                    playFinishRingtone();
                  }
                }
                if (
                  before &&
                  before.status !== "available" &&
                  machine.status === "available" &&
                  watchesRef.current.has(machine.id)
                ) {
                  const key = `${machine.id}-free-${machine.status}`;
                  if (!alerted.current.has(key)) {
                    alerted.current.add(key);
                    alerts = pushLocalAlert(
                      alerts,
                      "available",
                      `${machine.label} ว่างแล้ว ไปสแกน QR ได้`,
                      `${machine.label} is free — scan the QR to start`,
                      machine.id,
                    );
                  }
                }
                if (
                  machine.status === "in_use" &&
                  machine.almostAt &&
                  Date.now() >= machine.almostAt &&
                  !machine.almostAlertSent &&
                  machine.ownerUid === uid
                ) {
                  const key = `${machine.id}-almost-${machine.almostAt}`;
                  if (!alerted.current.has(key)) {
                    alerted.current.add(key);
                    const mins = remainingCycleMinutes(machine.finishTime ?? machine.cycleEndsAt ?? Date.now());
                    alerts = pushLocalAlert(
                      alerts,
                      "almost_done",
                      `${machine.label} ใกล้เสร็จแล้ว เหลืออีกประมาณ ${mins} นาที กรุณาเตรียมไปรับผ้า`,
                      `${machine.label} is almost done — about ${mins} min left`,
                      machine.id,
                    );
                    void markAlmostAlertSent(machine.id);
                  }
                }
              }
              prevRef.current = new Map(machines.map((item) => [item.id, item]));
              return { ...prev, machines, alerts, connected: true, error: null };
            });
          },
          (error) => {
            setState((prev) => ({ ...prev, connected: false, error: error.message }));
          },
          scope,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "FIREBASE_ERROR";
        setState((prev) => ({ ...prev, error: message, connected: false }));
      }
    })();

    return () => {
      cancelled = true;
      unsubMachines?.();
    };
  }, [uid, scopeKey]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const machine of prevRef.current.values()) {
        if (
          machine.status === "in_use" &&
          machine.finishTime &&
          now >= machine.finishTime &&
          machine.ownerUid === uid &&
          !finishing.current.has(machine.id)
        ) {
          finishing.current.add(machine.id);
          void markMachineFinished(machine.id).finally(() => {
            finishing.current.delete(machine.id);
          });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [uid]);

  const value = useMemo<LiveContext>(
    () => ({ ...state, uid, setInterest }),
    [state, uid, setInterest],
  );

  return createElement(MachineLiveContext.Provider, { value }, children);
}

export function useMachineLive(query: MachinesQuery & { skip?: boolean } = { all: true }) {
  const ctx = useContext(MachineLiveContext);
  const key = useId();
  const dormKey = (query.dormIds ?? []).join(",");
  const skip = Boolean(query.skip);
  const setInterest = ctx?.setInterest;

  useEffect(() => {
    if (!setInterest) return;
    if (skip) {
      setInterest(key, null);
      return;
    }
    setInterest(key, {
      all: query.all,
      dormIds: query.dormIds,
      machineId: query.machineId,
    });
    return () => setInterest(key, null);
  }, [setInterest, key, skip, query.all, query.machineId, dormKey]);

  if (!ctx) {
    return {
      machines: [],
      alerts: [],
      connected: false,
      configured: isFirebaseConfigured(),
      error: "FIREBASE_NOT_CONFIGURED",
      uid: null,
    };
  }
  return ctx;
}

export async function machineAction(
  id: string,
  action: "start" | "collect" | "cancel",
  minutes?: number | "demo",
  ownerName?: string,
  ownerPhone?: string,
  cycleMode?: "wash" | "dry",
) {
  if (action === "start") {
    await startMachine(id, minutes ?? 30, ownerName ?? "", ownerPhone ?? "", cycleMode);
    return;
  }
  if (action === "cancel") {
    await cancelCycle(id);
    return;
  }
  await collectClothes(id);
}
