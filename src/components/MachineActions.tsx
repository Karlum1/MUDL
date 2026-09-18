"use client";

import { machineAction } from "@/hooks/useMachineLive";
import { STATUS_COPY } from "@/lib/status";
import type { Machine } from "@/lib/types";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useState } from "react";

export function MachineActions({ machine }: { machine: Machine }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = STATUS_COPY[machine.status];

  async function run(action: "start" | "collect", minutes?: 30 | 45 | "demo") {
    setPending(true);
    setError(null);
    try {
      await machineAction(machine.id, action, minutes);
    } catch (err) {
      const code = err instanceof Error ? err.message : "FAILED";
      const map: Record<string, string> = {
        MACHINE_BUSY: "เครื่องนี้กำลังถูกใช้หรือยังมีผ้าอยู่",
        NOT_FINISHED: "ยังซักไม่เสร็จ ไม่สามารถเคลียร์ผ้าได้",
        MACHINE_NOT_FOUND: "ไม่พบเครื่องนี้",
      };
      setError(map[code] ?? "ทำรายการไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs ${copy.badge}`}>
        {copy.th}
      </span>
      <h1 className="mt-4 text-3xl font-semibold text-white">{machine.label}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {machine.id.toUpperCase()} · ชั้น {machine.floor} · ไม่ต้องลงชื่อ
      </p>

      {machine.status === "in_use" && (
        <div className="mt-8">
          <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} />
        </div>
      )}

      {machine.status === "available" && (
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run("start", 30)}
            className="rounded-2xl bg-cyan-300 px-4 py-4 text-base font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            เริ่มซัก 30 นาที
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("start", 45)}
            className="rounded-2xl bg-white/10 px-4 py-4 text-base font-semibold text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60"
          >
            เริ่มซัก 45 นาที
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("start", "demo")}
            className="rounded-2xl px-4 py-3 text-sm text-slate-400 hover:text-white"
          >
            ทดลอง 20 วินาที (สำหรับเดโม)
          </button>
        </div>
      )}

      {machine.status === "finished" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("collect")}
          className="mt-8 w-full rounded-2xl bg-amber-300 px-4 py-4 text-base font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
        >
          เอาผ้าออกแล้ว · ปล่อยเครื่องว่าง
        </button>
      )}

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
