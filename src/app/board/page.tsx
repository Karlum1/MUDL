"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { displayOwnerName } from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import { bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import { useMachineLive } from "@/hooks/useMachineLive";
import Link from "next/link";

export default function BoardPage() {
  const { machines, connected } = useMachineLive();
  const dateKey = bangkokDateKey();

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Dorm Laundry</p>
          <h1 className="text-2xl font-semibold">จอสถานะ · {bangkokDateLabel(dateKey)}</h1>
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

      <main className="grid flex-1 gap-4 px-6 pb-8 md:grid-cols-2">
        {machines.map((machine) => {
          const copy = STATUS_COPY[machine.status];
          return (
            <article
              key={machine.id}
              className="rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <WashingMachineVisual status={machine.status} size="sm" />
                  <div>
                    <p className="text-lg font-semibold">{machine.label}</p>
                    <p className="text-xs text-slate-400">{copy.th}</p>
                    {machine.status !== "available" && machine.status !== "maintenance" && (
                      <p className="mt-1 text-sm text-cyan-100">
                        {displayOwnerName(machine.ownerName)}
                      </p>
                    )}
                  </div>
                </div>
                {machine.status === "in_use" ? (
                  <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} compact />
                ) : (
                  <p className="text-sm text-slate-400">
                    {machine.status === "finished"
                      ? "รอเอาผ้าออก"
                      : machine.status === "maintenance"
                        ? "ปิดซ่อม"
                        : "ว่าง"}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
