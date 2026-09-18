"use client";

import { actionErrorMessage } from "@/lib/errors";
import { bangkokDateKey, bangkokDateLabel } from "@/lib/day";
import { machineAction } from "@/hooks/useMachineLive";
import type { QueueTicket } from "@/lib/types";
import { useState } from "react";

const STATUS_LABEL: Record<QueueTicket["status"], string> = {
  waiting: "รอเรียก",
  called: "ถึงคิวแล้ว — ไปเริ่มภายใน 5 นาที",
  in_use: "กำลังซัก",
  done: "เสร็จแล้ว",
  expired: "ไม่มา — ข้ามคิว",
  cancelled: "ยกเลิก",
};

export function TicketCard({
  ticket,
  highlight = false,
  canCancel = false,
}: {
  ticket: QueueTicket;
  highlight?: boolean;
  canCancel?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const showCancel =
    canCancel && (ticket.status === "waiting" || ticket.status === "called");

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      await machineAction(ticket.id, "cancelTicket");
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`rounded-3xl border p-5 ${
        ticket.status === "expired"
          ? "border-rose-300/30 bg-rose-400/10"
          : highlight
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
      <p className="mt-3 text-sm text-cyan-100">{STATUS_LABEL[ticket.status]}</p>
      {showCancel && (
        <button
          type="button"
          disabled={pending}
          onClick={cancel}
          className="mt-4 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-rose-200 hover:bg-white/15"
        >
          ยกเลิกบัตรคิว
        </button>
      )}
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
