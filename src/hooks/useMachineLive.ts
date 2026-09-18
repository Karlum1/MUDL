"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import {
  collectClothes,
  markAlmostAlertSent,
  markMachineFinished,
  seedMachinesIfEmpty,
  startMachine,
  subscribeMachines,
} from "@/lib/machines";
import type { AlertEvent, Machine } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type LiveState = {
  machines: Machine[];
  alerts: AlertEvent[];
  connected: boolean;
  configured: boolean;
  error: string | null;
};

function pushLocalAlert(
  prev: AlertEvent[],
  machine: Machine,
  kind: AlertEvent["kind"],
): AlertEvent[] {
  const alert: AlertEvent = {
    id: `${machine.id}-${kind}-${Date.now()}`,
    kind,
    machineId: machine.id,
    createdAt: Date.now(),
    messageTh:
      kind === "almost_done"
        ? `${machine.label} ใกล้เสร็จแล้ว กรุณาเตรียมไปรับผ้า`
        : kind === "finished"
          ? `${machine.label} ซักเสร็จแล้ว แต่ยังไม่ได้เอาผ้าออก`
          : `${machine.label} ว่างแล้ว พร้อมใช้งาน`,
    messageEn:
      kind === "almost_done"
        ? `${machine.label} is almost done — head over soon`
        : kind === "finished"
          ? `${machine.label} finished — clothes not collected yet`
          : `${machine.label} is now available`,
  };

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(alert.messageTh, {
      body: alert.messageEn,
      tag: `${machine.id}-${kind}`,
    });
  }

  return [alert, ...prev].slice(0, 40);
}

export function useMachineLive() {
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

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await seedMachinesIfEmpty();
        if (cancelled) return;
        unsubscribe = subscribeMachines(
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
                    alerts = pushLocalAlert(alerts, machine, "finished");
                  }
                }
                if (before?.status !== "available" && machine.status === "available" && before) {
                  const key = `${machine.id}-available-${machine.finishTime}`;
                  if (!alerted.current.has(key)) {
                    alerted.current.add(key);
                    alerts = pushLocalAlert(alerts, machine, "available");
                  }
                }
                if (
                  machine.status === "in_use" &&
                  machine.almostAt &&
                  Date.now() >= machine.almostAt &&
                  !machine.almostAlertSent
                ) {
                  const key = `${machine.id}-almost-${machine.almostAt}`;
                  if (!alerted.current.has(key)) {
                    alerted.current.add(key);
                    alerts = pushLocalAlert(alerts, machine, "almost_done");
                    void markAlmostAlertSent(machine.id);
                  }
                }
              }

              prevRef.current = new Map(machines.map((item) => [item.id, item]));
              return {
                ...prev,
                machines,
                alerts,
                connected: true,
                error: null,
              };
            });
          },
          (error) => {
            setState((prev) => ({
              ...prev,
              connected: false,
              error: error.message,
            }));
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "FIREBASE_ERROR";
        setState((prev) => ({ ...prev, error: message, connected: false }));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const machine of prevRef.current.values()) {
        if (
          machine.status === "in_use" &&
          machine.finishTime &&
          now >= machine.finishTime &&
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
  }, []);

  return state;
}

export async function machineAction(
  id: string,
  action: "start" | "collect",
  minutes?: 30 | 45 | "demo",
) {
  if (action === "start") {
    await startMachine(id, minutes ?? 30);
    return;
  }
  await collectClothes(id);
}
