"use client";

import { actionErrorMessage } from "@/lib/errors";
import { TicketCard } from "@/components/TicketCard";
import { machineAction } from "@/hooks/useMachineLive";
import { registerWebPush } from "@/lib/session";
import type { AlertEvent, QueueTicket } from "@/lib/types";
import { useEffect, useState } from "react";

export function NotificationDock({
  alerts,
  tickets,
  uid,
}: {
  alerts: AlertEvent[];
  tickets: QueueTicket[];
  uid: string | null;
}) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  async function enablePush() {
    if (!uid) return;
    const ok = await registerWebPush(uid);
    setPermission(Notification.permission);
    setEnabled(ok || Notification.permission === "granted");
  }

  async function takeTicket() {
    setPending(true);
    setQueueError(null);
    try {
      await machineAction("queue", "queue");
    } catch (err) {
      setQueueError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const latest = alerts.slice(0, 3);
  const myOpen = tickets.filter(
    (ticket) =>
      ticket.status === "waiting" ||
      ticket.status === "called" ||
      ticket.status === "in_use",
  )[0];

  return (
    <aside className="space-y-3">
      {myOpen && <TicketCard ticket={myOpen} highlight />}

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">แจ้งเตือน · Web Push</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          เตือนใกล้เสร็จ ผ้าเสร็จ และถึงคิว แม้ปิดแอป (ต้องเปิด Web Push)
        </p>
        <button
          type="button"
          onClick={enablePush}
          className="mt-4 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {enabled ? "เปิดการแจ้งเตือนแล้ว" : "เปิด Web Push บนเครื่องนี้"}
        </button>
        <button
          type="button"
          disabled={pending || Boolean(myOpen)}
          onClick={takeTicket}
          className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
        >
          {myOpen ? "มีบัตรคิววันนี้แล้ว" : "เก็บบัตรคิว (เมื่อเครื่องเต็ม)"}
        </button>
        {permission === "denied" && (
          <p className="mt-2 text-xs text-amber-200">
            เบราว์เซอร์บล็อกการแจ้งเตือน — ยังเห็นข้อความในแอปได้
          </p>
        )}
        {queueError && <p className="mt-2 text-xs text-rose-300">{queueError}</p>}
      </div>

      <div className="space-y-2">
        {latest.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
            ยังไม่มีแจ้งเตือน
          </p>
        )}
        {latest.map((alert) => (
          <article
            key={alert.id}
            className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3"
          >
            <p className="text-sm font-medium text-cyan-100">{alert.messageTh}</p>
            <p className="mt-1 text-xs text-slate-400">{alert.messageEn}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
