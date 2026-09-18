"use client";

import type { AlertEvent } from "@/lib/types";
import { useEffect, useState } from "react";

export function NotificationDock({ alerts }: { alerts: AlertEvent[] }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setEnabled(result === "granted");
  }

  const latest = alerts.slice(0, 3);

  return (
    <aside className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">แจ้งเตือน · Alerts</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          เตือนเมื่อใกล้เสร็จ (ประมาณ 5 นาที) หรือเมื่อเครื่องว่าง
        </p>
        <button
          type="button"
          onClick={enablePush}
          className="mt-4 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {enabled ? "เปิดการแจ้งเตือนแล้ว" : "เปิด Web Push บนเครื่องนี้"}
        </button>
        {permission === "denied" && (
          <p className="mt-2 text-xs text-amber-200">
            เบราว์เซอร์บล็อกการแจ้งเตือน — ยังเห็นข้อความในแอปได้
          </p>
        )}
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
