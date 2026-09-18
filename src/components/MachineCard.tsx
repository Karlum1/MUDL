"use client";

import { CountdownTimer } from "@/components/CountdownTimer";
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
    <Link
      href={`/machine/${machine.id}`}
      className={`group block rounded-3xl border border-white/8 bg-slate-900/70 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-300/30 ${copy.glow} ${
        isMine ? "ring-2 ring-cyan-300/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            ชั้น {machine.floor} · {machine.id.toUpperCase()}
            {machine.ticketNumber ? ` · คิว ${String(machine.ticketNumber).padStart(3, "0")}` : ""}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {machine.label}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${copy.badge}`}>
          {isMine ? "รอบของฉัน" : copy.th}
        </span>
      </div>

      <div className="mt-6 min-h-[72px]">
        {machine.status === "available" && (
          <p className="text-sm leading-6 text-slate-300">พร้อมซักได้ทันที · Available now</p>
        )}
        {machine.status === "out_of_order" && (
          <p className="text-sm leading-6 text-rose-200">ปิดใช้ชั่วคราว</p>
        )}
        {machine.status === "reserved" && (
          <p className="text-sm leading-6 text-violet-100">
            จองให้คิว {machine.ticketNumber ? String(machine.ticketNumber).padStart(3, "0") : "ถัดไป"} · เริ่มได้ภายใน 5 นาที
          </p>
        )}
        {machine.status === "in_use" && (
          <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} compact />
        )}
        {machine.status === "finished" && (
          <p className="text-sm leading-6 text-amber-100/90">
            กรุณาเอาผ้าออก เพื่อให้คนถัดไปใช้ได้
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500 group-hover:text-cyan-200">
        แตะเพื่อดูรายละเอียด / สแกน QR →
      </p>
    </Link>
  );
}
