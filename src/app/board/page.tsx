"use client";

import { STATUS_COPY } from "@/lib/status";
import { bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import { useMachineLive } from "@/hooks/useMachineLive";
import Link from "next/link";

export default function BoardPage() {
  const { machines, tickets, connected, waiting, serving } = useMachineLive();
  const dateKey = bangkokDateKey();
  const nowServing = serving[0];
  const nextUp = waiting.filter((t) => t.status === "waiting").slice(0, 6);

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Dorm Laundry Queue</p>
          <h1 className="text-2xl font-semibold">จอแสดงคิว · {bangkokDateLabel(dateKey)}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className={connected ? "text-emerald-300" : "text-amber-200"}>
            {connected ? "สด" : "กำลังเชื่อม"}
          </span>
          <Link href="/" className="text-slate-400 hover:text-white">
            กลับแอป
          </Link>
        </div>
      </header>

      <main className="grid flex-1 gap-6 px-6 pb-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col justify-center rounded-[2.5rem] border border-white/10 bg-slate-900/50 p-8">
          <p className="text-lg text-slate-400">กำลังเรียก / กำลังซัก</p>
          <p className="mt-4 font-mono text-[8rem] leading-none font-semibold tabular-nums text-cyan-200">
            {nowServing ? String(nowServing.number).padStart(3, "0") : "---"}
          </p>
          <p className="mt-6 text-xl text-slate-300">
            {nowServing
              ? nowServing.status === "called"
                ? "กรุณาไปเริ่มซักภายใน 5 นาที"
                : "กำลังใช้งานเครื่อง"
              : "ยังไม่มีการเรียกคิว"}
          </p>
          <div className="mt-10">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">คิวถัดไป</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {nextUp.length === 0 && <span className="text-slate-500">ไม่มีคนรอ</span>}
              {nextUp.map((ticket) => (
                <span
                  key={ticket.id}
                  className="rounded-2xl bg-white/10 px-5 py-3 font-mono text-3xl tabular-nums"
                >
                  {String(ticket.number).padStart(3, "0")}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {machines.map((machine) => {
            const copy = STATUS_COPY[machine.status];
            return (
              <article
                key={machine.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{machine.label}</p>
                    <p className="text-xs text-slate-400">{copy.th}</p>
                  </div>
                  <p className="font-mono text-3xl tabular-nums text-cyan-100">
                    {machine.ticketNumber
                      ? String(machine.ticketNumber).padStart(3, "0")
                      : "--"}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
