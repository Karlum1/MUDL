"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { QrPoster } from "@/components/QrPoster";
import { useMachineLive } from "@/hooks/useMachineLive";
import { actionErrorMessage } from "@/lib/errors";
import {
  subscribeAnnouncements,
  subscribeMaintenanceLogs,
  subscribeUsageHours,
} from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import type { Announcement, MaintenanceLog } from "@/lib/types";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const PIN_KEY = "wm-admin-pin-v1";

async function adminRequest(pin: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, ...payload }),
  });
  const text = await res.text();
  let data: { error?: string; ok?: boolean; pushed?: number };
  try {
    data = JSON.parse(text) as { error?: string; ok?: boolean; pushed?: number };
  } catch {
    throw new Error("ADMIN_HTML_RESPONSE");
  }
  if (!res.ok) {
    throw new Error(data.error || "ADMIN_FAILED");
  }
  return data;
}

export default function AdminPage() {
  const { machines, connected } = useMachineLive();
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [messageTh, setMessageTh] = useState("");
  const [pushToo, setPushToo] = useState(true);
  const [hours, setHours] = useState<number[]>(() => Array.from({ length: 24 }, () => 0));
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) {
      setPin(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const unsubHours = subscribeUsageHours(setHours, () => undefined);
    const unsubLogs = subscribeMaintenanceLogs(setLogs, () => undefined);
    const unsubNews = subscribeAnnouncements(setAnnouncements, () => undefined);
    return () => {
      unsubHours();
      unsubLogs();
      unsubNews();
    };
  }, [unlocked]);

  const peak = useMemo(() => {
    const max = Math.max(1, ...hours);
    const peakHour = hours.indexOf(Math.max(...hours));
    return { max, peakHour, total: hours.reduce((sum, n) => sum + n, 0) };
  }, [hours]);

  async function run(payload: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      await adminRequest(pin, payload);
    } catch (err) {
      setError(actionErrorMessage(err));
      if (err instanceof Error && err.message === "ADMIN_PIN_REQUIRED") {
        setUnlocked(false);
        sessionStorage.removeItem(PIN_KEY);
      }
    } finally {
      setPending(false);
    }
  }

  async function unlockSimple(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await adminRequest(pin, { action: "session" });
      sessionStorage.setItem(PIN_KEY, pin);
      setUnlocked(true);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader connected={connected} />
        <main className="mx-auto w-full max-w-md px-4 py-16">
          <h1 className="text-3xl font-semibold text-white">ผู้ดูแลห้องซักผ้า</h1>
          <p className="mt-2 text-sm text-slate-400">
            ใส่รหัส ADMIN_PIN (หรือ CRON_SECRET) จาก .env.local — ตรวจสิทธิ์ก่อนสั่งงาน
          </p>
          <form onSubmit={unlockSimple} className="mt-8 space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="รหัสผู้ดูแล"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-300/40"
            />
            <button
              type="submit"
              disabled={pending || !pin}
              className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              เข้าสู่ระบบผู้ดูแล
            </button>
            {error && <p className="text-sm text-rose-300">{error}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">ควบคุมเครื่องและประกาศ</h1>
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">QR สำหรับติดเครื่อง</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                พิมพ์แล้วติดที่เครื่อง — สแกนแล้วเปิดหน้าตั้งเวลา (`?scan=1`)
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              พิมพ์ QR
            </button>
          </div>
          <div className="mt-6">
            <QrPoster machines={machines} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {machines.map((machine) => {
            const copy = STATUS_COPY[machine.status];
            return (
              <article
                key={machine.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{machine.label}</h2>
                    <p className="text-xs text-slate-400">{machine.id.toUpperCase()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${copy.badge}`}>{copy.th}</span>
                </div>
                {machine.maintenanceNote && (
                  <p className="mt-2 text-sm text-rose-100">{machine.maintenanceNote}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run({ action: "reset", machineId: machine.id, note })}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                  >
                    รีเซ็ตว่าง
                  </button>
                  {machine.status === "maintenance" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run({ action: "reopen", machineId: machine.id, note })}
                      className="rounded-xl bg-emerald-400/20 px-3 py-2 text-xs font-semibold text-emerald-100"
                    >
                      เปิดใช้ใหม่
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run({
                          action: "maintenance",
                          machineId: machine.id,
                          note: note || "ปิดปรับปรุงชั่วคราว",
                        })
                      }
                      className="rounded-xl bg-rose-400/20 px-3 py-2 text-xs font-semibold text-rose-100"
                    >
                      ปิดปรับปรุง
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <label className="block text-sm text-slate-400">
          หมายเหตุคำสั่ง (ใส่หรือไม่ใส่ก็ได้)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
            placeholder="เช่น มอเตอร์เสีย, ผ้าค้าง"
          />
        </label>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold text-white">ประกาศถึงลูกบ้าน</h2>
          <textarea
            value={messageTh}
            onChange={(event) => setMessageTh(event.target.value)}
            rows={3}
            maxLength={280}
            placeholder="เช่น เครื่อง 3 ปิดซ่อมถึงเย็นนี้"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={pushToo}
              onChange={(event) => setPushToo(event.target.checked)}
            />
            ส่ง Web Push ด้วย
          </label>
          <button
            type="button"
            disabled={pending || !messageTh.trim()}
            onClick={() => {
              void run({ action: "announce", messageTh, push: pushToo }).then(() =>
                setMessageTh(""),
              );
            }}
            className="mt-4 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            ส่งประกาศ
          </button>
          <div className="mt-4 space-y-2">
            {announcements.map((item) => (
              <p key={item.id} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-cyan-100">
                {item.messageTh}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold text-white">ช่วงเวลาหนาแน่นวันนี้</h2>
          <p className="mt-1 text-sm text-slate-400">
            เริ่มซักแล้ว {peak.total} รอบ
            {peak.total > 0 ? ` · หนาแน่นสุดช่วง ${String(peak.peakHour).padStart(2, "0")}:00` : ""}
          </p>
          <div className="mt-4 flex h-32 items-end gap-1">
            {hours.map((count, hour) => (
              <div key={hour} className="flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-cyan-300/80"
                  style={{ height: `${(count / peak.max) * 100}%`, minHeight: count ? 4 : 0 }}
                  title={`${hour}:00 · ${count}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">แกนนอน = ชั่วโมง 00–23 ตามเวลาไทย</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="font-semibold text-white">ประวัติซ่อม / คำสั่งผู้ดูแล</h2>
          <div className="mt-4 space-y-2">
            {logs.length === 0 && <p className="text-sm text-slate-500">ยังไม่มีบันทึก</p>}
            {logs.map((log) => (
              <article key={log.id} className="rounded-2xl bg-white/5 px-4 py-3 text-sm">
                <p className="text-white">
                  {log.action} · {log.machineId}
                </p>
                <p className="mt-1 text-slate-400">{log.note}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
