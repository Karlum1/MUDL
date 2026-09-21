"use client";

import { subscribeAnnouncements } from "@/lib/machines";
import { registerWebPush } from "@/lib/session";
import type { AlertEvent, Announcement } from "@/lib/types";
import { useEffect, useState } from "react";

export function NotificationDock({
  alerts,
  uid,
}: {
  alerts: AlertEvent[];
  uid: string | null;
}) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    return subscribeAnnouncements(setAnnouncements, () => undefined);
  }, []);

  async function enablePush() {
    if (!uid) return;
    const ok = await registerWebPush(uid);
    setPermission(Notification.permission);
    setEnabled(ok || Notification.permission === "granted");
  }

  const latest = alerts.slice(0, 3);

  return (
    <aside className="space-y-3">
      {announcements[0] && (
        <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200">ประกาศหอ</p>
          <p className="mt-2 text-sm leading-6 text-amber-50">{announcements[0].messageTh}</p>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">แจ้งเตือน · Web Push</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          เตือนใกล้เสร็จและผ้าเสร็จ แม้ปิดแอป (ต้องเปิด Web Push)
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
