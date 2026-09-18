"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import {
  collectClothes,
  joinQueue,
  markAlmostAlertSent,
  markMachineFinished,
  seedMachinesIfEmpty,
  startMachine,
  subscribeMachines,
  subscribeTodayTickets,
} from "@/lib/machines";
import type { AlertEvent, Machine, QueueTicket } from "@/lib/types";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { useEffect, useMemo, useRef, useState } from "react";

type LiveState = {
  machines: Machine[];
  tickets: QueueTicket[];
  alerts: AlertEvent[];
  connected: boolean;
  configured: boolean;
  error: string | null;
};

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
    new Notification(messageTh, { body: messageEn, tag: `${kind}-${machineId}` });
  }
  return [alert, ...prev].slice(0, 40);
}

export function useMachineLive() {
  const uid = useAnonymousSession();
  const [state, setState] = useState<LiveState>({
    machines: [],
    tickets: [],
    alerts: [],
    connected: false,
    configured: isFirebaseConfigured(),
    error: isFirebaseConfigured() ? null : "FIREBASE_NOT_CONFIGURED",
  });
  const prevRef = useRef<Map<string, Machine>>(new Map());
  const finishing = useRef(new Set<string>());
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid) return;

    let unsubMachines: (() => void) | undefined;
    let unsubTickets: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await seedMachinesIfEmpty();
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
                    alerts = pushLocalAlert(
                      alerts,
                      "almost_done",
                      `${machine.label} ใกล้เสร็จแล้ว กรุณาเตรียมไปรับผ้า`,
                      `${machine.label} is almost done — head over soon`,
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
        );
        unsubTickets = subscribeTodayTickets(
          (tickets) => setState((prev) => ({ ...prev, tickets })),
          (error) => setState((prev) => ({ ...prev, error: error.message })),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "FIREBASE_ERROR";
        setState((prev) => ({ ...prev, error: message, connected: false }));
      }
    })();

    return () => {
      cancelled = true;
      unsubMachines?.();
      unsubTickets?.();
    };
  }, [uid]);

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

  const myTickets = useMemo(
    () => state.tickets.filter((ticket) => ticket.uid === uid),
    [state.tickets, uid],
  );
  const waiting = useMemo(
    () => state.tickets.filter((ticket) => ticket.status === "waiting" || ticket.status === "called"),
    [state.tickets],
  );
  const serving = useMemo(
    () => state.tickets.filter((ticket) => ticket.status === "in_use" || ticket.status === "called"),
    [state.tickets],
  );

  return { ...state, uid, myTickets, waiting, serving };
}

export async function machineAction(
  id: string,
  action: "start" | "collect" | "queue",
  minutes?: 30 | 45 | "demo",
) {
  if (action === "start") {
    await startMachine(id, minutes ?? 30);
    return;
  }
  if (action === "queue") {
    return joinQueue();
  }
  await collectClothes(id);
}
