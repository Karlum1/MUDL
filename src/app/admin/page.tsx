"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { useMachineLive } from "@/hooks/useMachineLive";
import { STATUS_COPY } from "@/lib/status";
import { actionErrorMessage } from "@/lib/errors";
import { useEffect, useState } from "react";

type Session = { ok: boolean; configured: boolean };

async function adminAction(
  action: string,
  extra?: { machineId?: string; ticketId?: string },
) {
  const response = await fetch("/api/admin/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "FAILED");
}

export default function AdminPage() {
  const live = useMachineLive();
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshSession() {
    const response = await fetch("/api/admin/session");
    const payload = (await response.json()) as Session;
    setSession(payload);
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          payload.error === "BAD_PASSWORD"
            ? "รหัสผ่านไม่ถูกต้อง"
            : payload.error === "ADMIN_PASSWORD_MISSING"
              ? "ยังไม่ได้ตั้ง DORM_ADMIN_PASSWORD ใน .env.local"
              : "เข้าสู่ระบบไม่สำเร็จ",
        );
      }
      setPassword("");
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: { machineId?: string; ticketId?: string }) {
    setPending(true);
    setError(null);
    try {
      await adminAction(action, extra);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const openTickets = live.tickets.filter(
    (t) => t.status === "waiting" || t.status === "called",
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={live.connected} />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-white">แอดมินหอ</h1>
        <p className="mt-2 text-slate-400">ปล่อยเครื่อง ปิดเครื่องเสีย ยกเลิกบัตร และรีเซ็ตคิววันนี้</p>

        {session && !session.ok && (
          <form onSubmit={login} className="mt-8 max-w-sm space-y-3 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <label className="block text-sm text-slate-300">
              รหัสผ่านหอ
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950"
            >
              เข้าสู่ระบบ
            </button>
            {session.configured === false && (
              <p className="text-xs text-amber-200">
                ตั้ง DORM_ADMIN_PASSWORD ใน .env.local และบน Vercel ก่อน
              </p>
            )}
          </form>
        )}

        {session?.ok && (
          <div className="mt-8 space-y-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => run("resetToday")}
                className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950"
              >
                รีเซ็ตคิววันนี้
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run("dispatch")}
                className="rounded-2xl bg-white/10 px-4 py-3 text-white"
              >
                เรียกคิวถัดไป
              </button>
              <button
                type="button"
                onClick={() => fetch("/api/admin/logout", { method: "POST" }).then(refreshSession)}
                className="rounded-2xl px-4 py-3 text-slate-400"
              >
                ออกจากระบบ
              </button>
            </div>

            <section>
              <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-slate-400">เครื่อง</h2>
              <div className="space-y-3">
                {live.machines.map((machine) => (
                  <article
                    key={machine.id}
                    className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">{machine.label}</p>
                      <p className="text-xs text-slate-400">{STATUS_COPY[machine.status].th}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run("release", { machineId: machine.id })}
                        className="rounded-xl bg-amber-300/90 px-3 py-2 text-sm text-slate-950"
                      >
                        ปล่อยเครื่อง
                      </button>
                      {machine.status === "out_of_order" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run("repair", { machineId: machine.id })}
                          className="rounded-xl bg-emerald-300/90 px-3 py-2 text-sm text-slate-950"
                        >
                          เปิดใช้
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run("break", { machineId: machine.id })}
                          className="rounded-xl bg-rose-300/90 px-3 py-2 text-sm text-slate-950"
                        >
                          ปิดเครื่องเสีย
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-slate-400">บัตรคิววันนี้</h2>
              {openTickets.length === 0 && (
                <p className="text-sm text-slate-500">ไม่มีคิวรอ</p>
              )}
              <div className="space-y-2">
                {openTickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
                  >
                    <p className="font-mono text-xl text-white">
                      {String(ticket.number).padStart(3, "0")}
                      <span className="ml-3 font-sans text-sm text-slate-400">
                        {ticket.status === "called" ? "กำลังเรียก" : "รอเรียก"}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run("cancelTicket", { ticketId: ticket.id })}
                      className="text-sm text-rose-200"
                    >
                      ยกเลิกบัตร
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {error && <p className="mt-6 text-sm text-rose-300">{error}</p>}
      </main>
    </div>
  );
}
