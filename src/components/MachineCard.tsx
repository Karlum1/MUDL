"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import { displayOwnerName } from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import type { Machine } from "@/lib/types";
import Link from "next/link";

export function MachineCard({
  machine,
  isMine = false,
}: {
  machine: Machine;
  isMine?: boolean;
}) {
  const copy = STATUS_COPY[machine.status];

  return (
    <article
      className={`rounded-3xl border border-white/8 bg-slate-900/70 p-5 backdrop-blur ${copy.glow} ${
        isMine ? "ring-2 ring-cyan-300/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            ชั้น {machine.floor} · {machine.id.toUpperCase()}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{machine.label}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${copy.badge}`}>
          {isMine ? "รอบของฉัน" : copy.th}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <WashingMachineVisual status={machine.status} />
        <div className="min-h-[72px] flex-1">
          {machine.status === "available" && (
            <p className="text-sm leading-6 text-slate-300">
              พร้อมซัก — สแกน QR ที่เครื่องเพื่อตั้งเวลา
            </p>
          )}
          {machine.status === "in_use" && (
            <div className="space-y-2">
              <p className="text-sm text-cyan-100">ใช้โดย {displayOwnerName(machine.ownerName)}</p>
              <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} compact />
            </div>
          )}
          {machine.status === "finished" && (
            <p className="text-sm leading-6 text-amber-100/90">
              {displayOwnerName(machine.ownerName)} ซักเสร็จแล้ว — กรุณาเอาผ้าออก
            </p>
          )}
          {machine.status === "maintenance" && (
            <p className="text-sm leading-6 text-rose-100">
              {machine.maintenanceNote || "ปิดปรับปรุงชั่วคราว — ใช้เครื่องอื่น"}
            </p>
          )}
        </div>
      </div>
      {isMine ? (
        <Link
          href={`/machine/${machine.id}`}
          className="mt-4 inline-block text-xs text-cyan-200 hover:text-cyan-100"
        >
          จัดการรอบของฉัน →
        </Link>
      ) : (
        <p className="mt-4 text-xs text-slate-500">ตั้งเวลาได้เฉพาะตอนสแกน QR ที่เครื่อง</p>
      )}
    </article>
  );
}
