"use client";

import { bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import type { QueueTicket } from "@/lib/types";

export function TicketCard({
  ticket,
  highlight = false,
}: {
  ticket: QueueTicket;
  highlight?: boolean;
}) {
  const statusLabel: Record<QueueTicket["status"], string> = {
    waiting: "รอเรียก",
    called: "ถึงคิวแล้ว",
    in_use: "กำลังซัก",
    done: "เสร็จแล้ว",
    expired: "หมดเวลา",
    cancelled: "ยกเลิก",
  };

  return (
    <div
      className={`rounded-3xl border p-5 ${
        highlight
          ? "border-cyan-300/40 bg-cyan-300/10"
          : "border-white/10 bg-slate-900/70"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        บัตรคิว {bangkokDateLabel(ticket.dateKey || bangkokDateKey())}
      </p>
      <p className="mt-2 font-mono text-5xl font-semibold tabular-nums text-white">
        {String(ticket.number).padStart(3, "0")}
      </p>
      <p className="mt-3 text-sm text-cyan-100">{statusLabel[ticket.status]}</p>
    </div>
  );
}
