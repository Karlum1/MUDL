"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { QrPoster } from "@/components/QrPoster";
import { useMachineLive } from "@/hooks/useMachineLive";
import { actionErrorMessage } from "@/lib/errors";
import {
  seedMachinesIfEmpty,
  subscribeAnnouncements,
  subscribeMaintenanceLogs,
} from "@/lib/machines";
import { dormLabel, subscribeUsageHits, type UsageHit } from "@/lib/dailyStats";
import { DORMS, SEED_MACHINES, dormById, dormSortIndex } from "@/lib/dorms";
import { bangkokMonthLabel, bangkokDateKey, bangkokDateLabel, bangkokClockLabel } from "@/lib/day";
import { STATUS_COPY } from "@/lib/status";
import { repairCategoryLabel } from "@/lib/repairCategories";
import type { Announcement, MaintenanceLog } from "@/lib/types";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const PIN_KEY = "wm-admin-pin-v1";
const VIEW_KEY = "wm-admin-view-v1";

const DORM_BAR: Record<string, string> = {
  int: "bg-cyan-300",
  sri: "bg-emerald-300",
  lee: "bg-amber-300",
  chai: "bg-violet-300",
  kan: "bg-rose-300",
  other: "bg-slate-300",
};

type AdminView = {
  sections: { qr: boolean; machines: boolean; announce: boolean; graphs: boolean; logs: boolean };
  qrDormIds: string[];
  logKinds: { report: boolean; maintenance: boolean; reopen: boolean; command: boolean };
};

const DEFAULT_VIEW: AdminView = {
  sections: { qr: true, machines: true, announce: true, graphs: true, logs: true },
  qrDormIds: DORMS.map((dorm) => dorm.id),
  logKinds: { report: true, maintenance: true, reopen: true, command: true },
};

function loadAdminView(): AdminView {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return DEFAULT_VIEW;
    const parsed = JSON.parse(raw) as Partial<AdminView>;
    const qrDormIds = Array.isArray(parsed.qrDormIds)
      ? parsed.qrDormIds.filter((id) => DORMS.some((dorm) => dorm.id === id))
      : DEFAULT_VIEW.qrDormIds;
    return {
      sections: { ...DEFAULT_VIEW.sections, ...parsed.sections },
      qrDormIds: qrDormIds.length > 0 ? qrDormIds : DEFAULT_VIEW.qrDormIds,
      logKinds: { ...DEFAULT_VIEW.logKinds, ...parsed.logKinds },
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

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
  const { machines, connected } = useMachineLive({ all: true });
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [messageTh, setMessageTh] = useState("");
  const [pushToo, setPushToo] = useState(true);
  const [hits, setHits] = useState<UsageHit[]>([]);
  const [graphDorm, setGraphDorm] = useState("all");
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [view, setView] = useState<AdminView>(DEFAULT_VIEW);
  const [viewReady, setViewReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved) {
      setPin(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    setView(loadAdminView());
    setViewReady(true);
  }, []);

  useEffect(() => {
    if (!viewReady) return;
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      /* quota */
    }
  }, [view, viewReady]);

  useEffect(() => {
    if (!unlocked) return;
    const unsubMonth = subscribeUsageHits(setHits, () => undefined);
    const unsubLogs = subscribeMaintenanceLogs(setLogs, () => undefined);
    const unsubNews = subscribeAnnouncements(setAnnouncements, () => undefined);
    return () => {
      unsubMonth();
      unsubLogs();
      unsubNews();
    };
  }, [unlocked]);

  const usage = useMemo(() => {
    const month = bangkokDateKey().slice(0, 7);
    const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const scoped = hits.filter((hit) => graphDorm === "all" || hit.dormId === graphDorm);
    const dormIds = [...new Set(scoped.map((hit) => hit.dormId))].sort(
      (a, b) => dormSortIndex(a) - dormSortIndex(b),
    );
    const byDay = Array.from({ length: days }, () => [] as { dormId: string; count: number }[]);
    for (let day = 0; day < days; day += 1) {
      const counts = new Map<string, number>();
      for (const hit of scoped) {
        if (hit.day !== day + 1) continue;
        counts.set(hit.dormId, (counts.get(hit.dormId) ?? 0) + 1);
      }
      byDay[day] = dormIds
        .map((dormId) => ({ dormId, count: counts.get(dormId) ?? 0 }))
        .filter((item) => item.count > 0);
    }
    const totals = byDay.map((parts) => parts.reduce((sum, part) => sum + part.count, 0));
    const total = totals.reduce((sum, count) => sum + count, 0);
    const max = Math.max(1, ...totals);
    const avg = totals.length ? total / totals.length : 0;
    const peopleSource =
      hoverDay === null ? scoped : scoped.filter((hit) => hit.day === hoverDay + 1);
    const peopleMap = new Map<string, { dormId: string; name: string; count: number }>();
    for (const hit of peopleSource) {
      const key = `${hit.dormId}\n${hit.ownerName}`;
      const current = peopleMap.get(key);
      if (current) current.count += 1;
      else peopleMap.set(key, { dormId: hit.dormId, name: hit.ownerName, count: 1 });
    }
    const people = [...peopleMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
    return { byDay, totals, total, max, avg, dormIds, people };
  }, [hits, graphDorm, hoverDay]);

  const repairLogs = useMemo(() => {
    return logs.filter((log) => {
      const kind =
        log.action === "report"
          ? "report"
          : log.action === "maintenance"
            ? "maintenance"
            : log.action === "reopen"
              ? "reopen"
              : "command";
      return view.logKinds[kind];
    });
  }, [logs, view.logKinds]);

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
      try {
        sessionStorage.setItem(PIN_KEY, pin);
      } catch {
        /* quota */
      }
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
        <SiteHeader connected={connected} repair={false} />
        <main className="mx-auto w-full max-w-md px-4 py-16">
          <h1 className="text-3xl font-semibold text-foreground">ผู้ดูแลห้องซักผ้า</h1>
          <p className="mt-2 text-sm text-muted">
            ใส่รหัส ADMIN_PIN (หรือ CRON_SECRET) จาก .env.local — ตรวจสิทธิ์ก่อนสั่งงาน
          </p>
          <form onSubmit={unlockSimple} className="mt-8 space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="รหัสผู้ดูแล"
              className="w-full rounded-2xl border border-line bg-field px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            />
            <button
              type="submit"
              disabled={pending || !pin}
              className="w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-fg disabled:opacity-50"
            >
              เข้าสู่ระบบผู้ดูแล
            </button>
            {error && <p className="text-sm text-bad">{error}</p>}
          </form>
      </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} repair={false} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">ควบคุมเครื่องและประกาศ</h1>
          </div>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}

        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-foreground">แสดงในหน้านี้</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["graphs", "กราฟ"],
                ["logs", "ประวัติซ่อมและคำสั่ง"],
                ["machines", "คำสั่งเครื่อง"],
                ["announce", "ประกาศ"],
                ["qr", "คิวอาร์"],
              ] as const
            ).map(([key, label]) => {
              const on = view.sections[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setView((current) => ({
                      ...current,
                      sections: { ...current.sections, [key]: !current.sections[key] },
                    }))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    on ? "bg-accent text-accent-fg" : "bg-chip text-muted ring-1 ring-line"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

          {view.sections.graphs && (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-foreground">การใช้รายวันเดือนนี้</h2>
          <p className="mt-1 text-sm text-muted">
            เดือน {bangkokMonthLabel(bangkokDateKey().slice(0, 7))}
            {graphDorm === "all" ? "" : ` · ${dormLabel(graphDorm)}`} มีผู้ใช้ {usage.total} รอบ
            {usage.avg > 0 ? ` · เฉลี่ย ${usage.avg.toFixed(1)} รอบ/วัน` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGraphDorm("all")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                graphDorm === "all" ? "bg-accent text-accent-fg" : "bg-chip text-muted ring-1 ring-line"
              }`}
            >
              ทุกหอ
            </button>
            {DORMS.map((dorm) => (
              <button
                key={dorm.id}
                type="button"
                onClick={() => setGraphDorm(dorm.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  graphDorm === dorm.id ? "bg-accent text-accent-fg" : "bg-chip text-muted ring-1 ring-line"
                }`}
              >
                {dorm.name}
              </button>
            ))}
          </div>
          <div className="relative mt-4" onMouseLeave={() => setHoverDay(null)}>
            <div className="relative flex items-end gap-0.5" style={{ height: 180 }}>
              {usage.avg > 0 && (
                <div
                  className="pointer-events-none absolute right-0 left-0 z-10 border-t border-dashed border-amber-200/70"
                  style={{ bottom: `${(usage.avg / usage.max) * 100}%` }}
                />
              )}
              {usage.byDay.map((parts, index) => (
                <div
                  key={index}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  onMouseEnter={() => setHoverDay(index)}
                >
                  {parts.map((part) => (
                    <div
                      key={part.dormId}
                      className={`w-full ${DORM_BAR[part.dormId] ?? DORM_BAR.other} ${
                        hoverDay === index ? "opacity-100" : "opacity-80"
                      }`}
                      style={{
                        height: `${(part.count / usage.max) * 100}%`,
                        minHeight: 3,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-0.5">
              {usage.byDay.map((_, index) => (
                <p
                  key={index}
                  className={`min-w-0 flex-1 text-center text-[8px] leading-none ${
                    (index + 1) % 5 === 0 || index === 0 ? "text-muted" : "text-transparent"
                  }`}
                >
                  {index + 1}
                </p>
              ))}
            </div>
          </div>
          {graphDorm === "all" && usage.dormIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              {usage.dormIds.map((dormId) => (
                <span key={dormId} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${DORM_BAR[dormId] ?? DORM_BAR.other}`} />
                  {dormLabel(dormId)}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-accent">
            {hoverDay === null
              ? "ชี้แท่งกราฟเพื่อดูว่าวันนั้นหอไหนใครใช้กี่รอบ"
              : `วันที่ ${hoverDay + 1} · ${usage.totals[hoverDay] ?? 0} รอบ`}
          </p>
          <div className="mt-3">
            <h3 className="text-sm font-semibold text-foreground">
              {hoverDay === null ? "คนที่ใช้ทั้งเดือน" : `คนที่ใช้วันที่ ${hoverDay + 1}`}
            </h3>
            {usage.people.length === 0 ? (
              <p className="mt-2 text-sm text-muted">ยังไม่มีรายการในช่วงนี้</p>
            ) : (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {usage.people.slice(0, 40).map((person) => (
                  <li
                    key={`${person.dormId}-${person.name}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-chip px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">{person.name}</span>
                      <span className="block truncate text-xs text-muted">{dormLabel(person.dormId)}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-accent">{person.count} รอบ</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        )}

        {view.sections.logs && (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-foreground">ประวัติซ่อมและคำสั่งผู้ดูแล</h2>
          <p className="mt-1 text-sm text-muted">รายการใหม่จะโชว์ที่นี่ รายการเก่าถูกล้างแล้ว และของที่เกิน 7 วันจะถูกลบอัตโนมัติ</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["report", "แจ้งเสีย"],
                ["maintenance", "ปิดปรับปรุง"],
                ["reopen", "เปิดใช้ใหม่"],
                ["command", "คำสั่งผู้ดูแล"],
              ] as const
            ).map(([key, label]) => {
              const on = view.logKinds[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setView((current) => ({
                      ...current,
                      logKinds: { ...current.logKinds, [key]: !current.logKinds[key] },
                    }))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    on ? "bg-accent text-accent-fg" : "bg-chip text-muted ring-1 ring-line"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <LogList
            key={Object.values(view.logKinds).join("")}
            logs={repairLogs}
            empty="ไม่มีรายการในตัวกรองนี้"
          />
        </section>
        )}
        {view.sections.machines && (
        <>
        <section className="space-y-8">
          {DORMS.map((dorm) => {
            const dormMachines = machines.filter((item) => item.dormId === dorm.id);
            if (dormMachines.length === 0) return null;
            return (
              <div key={dorm.id}>
                <h2 className="mb-3 text-lg font-semibold text-foreground">
                  {dorm.name}{" "}
                  <span className="text-sm font-normal text-muted">{dorm.halls}</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {dormMachines.map((machine) => {
                    const copy = STATUS_COPY[machine.status];
                    return (
                      <article
                        key={machine.id}
                        className="rounded-3xl border border-line bg-surface p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold text-foreground">{machine.label}</h2>
                            <p className="text-xs text-muted">{machine.id.toUpperCase()}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs ${copy.badge}`}>{copy.th}</span>
                        </div>
                        {machine.maintenanceNote && (
                          <p className="mt-2 text-sm text-bad">{machine.maintenanceNote}</p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run({ action: "reset", machineId: machine.id, note })}
                            className="rounded-xl bg-chip px-3 py-2 text-xs font-semibold text-foreground"
                          >
                            รีเซ็ตว่าง
                          </button>
                          {machine.status === "maintenance" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run({ action: "reopen", machineId: machine.id, note })}
                              className="rounded-xl bg-emerald-400/20 px-3 py-2 text-xs font-semibold text-ok"
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
                              className="rounded-xl bg-rose-400/20 px-3 py-2 text-xs font-semibold text-bad"
                            >
                              ปิดปรับปรุง
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <label className="block text-sm text-muted">
          หมายเหตุคำสั่ง (ใส่หรือไม่ใส่ก็ได้)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-field px-4 py-3 text-foreground"
            placeholder="เช่น มอเตอร์เสีย, ผ้าค้าง"
          />
        </label>
        </>
        )}

        {view.sections.announce && (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-foreground">ประกาศถึงลูกบ้าน</h2>
          <textarea
            value={messageTh}
            onChange={(event) => setMessageTh(event.target.value)}
            rows={3}
            maxLength={280}
            placeholder="เช่น เครื่อง 3 ปิดซ่อมถึงเย็นนี้"
            className="mt-3 w-full rounded-2xl border border-line bg-field px-4 py-3 text-foreground"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
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
            className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            ส่งประกาศ
          </button>
          <div className="mt-4 space-y-2">
            {announcements.map((item) => (
              <p key={item.id} className="rounded-2xl bg-chip px-4 py-3 text-sm text-foreground">
                {item.messageTh}
              </p>
            ))}
          </div>
        </section>
        )}

        {view.sections.qr && (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">QR สำหรับติดเครื่อง</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                พิมพ์แล้วติดที่เครื่อง — เปิดลิงก์อย่างเดียวเริ่มรอบไม่ได้ ต้องสแกนด้วยกล้องในแอป
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-chip px-3 py-2 text-xs font-semibold text-foreground"
            >
              พิมพ์ QR
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setPending(true);
                setError(null);
                void seedMachinesIfEmpty(true)
                  .catch((err) => setError(actionErrorMessage(err)))
                  .finally(() => setPending(false));
              }}
              className="rounded-xl bg-chip px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
            >
              ซิงค์รายชื่อเครื่อง
            </button>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground print:hidden">หอที่จะพิมพ์</p>
          <div className="mt-2 flex flex-wrap gap-2 print:hidden">
            {DORMS.map((dorm) => {
              const on = view.qrDormIds.includes(dorm.id);
              return (
                <button
                  key={dorm.id}
                  type="button"
                  onClick={() =>
                    setView((current) => {
                      const has = current.qrDormIds.includes(dorm.id);
                      const next = has
                        ? current.qrDormIds.filter((id) => id !== dorm.id)
                        : [...current.qrDormIds, dorm.id];
                      return { ...current, qrDormIds: next.length > 0 ? next : current.qrDormIds };
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    on ? "bg-accent text-accent-fg" : "bg-chip text-muted ring-1 ring-line"
                  }`}
                >
                  {dorm.name}
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <QrPoster
              machines={SEED_MACHINES.filter((item) => view.qrDormIds.includes(item.dormId)).map((item) => {
                const dorm = dormById(item.dormId);
                return {
                  id: item.id,
                  label: item.label,
                  dormId: item.dormId,
                  dormName: dorm?.name ?? "",
                  halls: dorm?.halls ?? "",
                };
              })}
            />
          </div>
        </section>
        )}

      </main>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  report: "แจ้งเสีย",
  maintenance: "ปิดปรับปรุง",
  reopen: "เปิดใช้ใหม่",
  reset: "รีเซ็ต",
  announce: "ประกาศ",
  auto_release: "ปล่อยผ้าค้าง",
};

const LOG_PAGE_SIZE = 8;

function LogList({ logs, empty }: { logs: MaintenanceLog[]; empty: string }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = logs.slice(safePage * LOG_PAGE_SIZE, safePage * LOG_PAGE_SIZE + LOG_PAGE_SIZE);

  return (
    <div className="mt-4">
      {logs.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {visible.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
      {logs.length > LOG_PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-foreground disabled:opacity-40"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ก่อนหน้า
          </button>
          <p className="text-muted">
            หน้า {safePage + 1} / {pages}
          </p>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1.5 text-foreground disabled:opacity-40"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: MaintenanceLog }) {
  const when = log.createdAt
    ? `${bangkokDateLabel(bangkokDateKey(new Date(log.createdAt)))} ${bangkokClockLabel(log.createdAt)}`
    : "";
  const category = repairCategoryLabel(log.category, "th");
  return (
    <article className="rounded-2xl bg-chip px-4 py-3 text-sm">
      <p className="text-foreground">
        {ACTION_LABEL[log.action] ?? log.action} · {log.machineId}
      </p>
      {category && (
        <p className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-fg">
          {category}
        </p>
      )}
      <p className={`text-foreground ${category ? "mt-2 text-base" : "mt-1"}`}>{log.note}</p>
      {when && <p className="mt-1 text-xs text-muted">{when}</p>}
    </article>
  );
}
