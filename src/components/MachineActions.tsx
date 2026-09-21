"use client";

import { actionErrorMessage } from "@/lib/errors";
import { machineAction } from "@/hooks/useMachineLive";
import { MAX_OWNER_NAME, displayOwnerName } from "@/lib/machines";
import { STATUS_COPY } from "@/lib/status";
import type { Machine } from "@/lib/types";
import { CountdownTimer } from "@/components/CountdownTimer";
import { WashingMachineVisual } from "@/components/WashingMachineVisual";
import Link from "next/link";
import { useState } from "react";

export function MachineActions({
  machine,
  uid,
  scanned,
}: {
  machine: Machine;
  uid: string | null;
  scanned: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const copy = STATUS_COPY[machine.status];
  const isMine = Boolean(uid && machine.ownerUid === uid);
  const canStart =
    scanned && (machine.status === "available" || machine.status === "reserved");

  async function run(action: "start" | "collect" | "cancel", minutes?: 30 | 45 | "demo") {
    if (action === "cancel") {
      const ok = window.confirm("ยกเลิกเวลาซักของเครื่องนี้ และปล่อยเครื่องว่าง?");
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    try {
      if (action === "start" && !scanned) throw new Error("SCAN_REQUIRED");
      await machineAction(machine.id, action, minutes, ownerName);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs ${copy.badge}`}>
          {copy.th}
        </span>
        {isMine && (
          <span className="inline-flex rounded-full bg-cyan-300/15 px-3 py-1 text-xs text-cyan-200">
            รอบของฉัน
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <WashingMachineVisual status={machine.status} size="sm" />
        <div>
          <h1 className="text-3xl font-semibold text-white">{machine.label}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {machine.id.toUpperCase()} · ชั้น {machine.floor}
          </p>
        </div>
      </div>
      {machine.status !== "available" && machine.status !== "maintenance" && (
        <p className="mt-2 text-sm text-cyan-100">กำลังใช้โดย {displayOwnerName(machine.ownerName)}</p>
      )}

      {machine.status === "in_use" && (
        <div className="mt-8">
          <CountdownTimer endsAt={machine.finishTime ?? machine.cycleEndsAt} />
        </div>
      )}

      {(machine.status === "available" || machine.status === "reserved") && !scanned && (
        <div className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
          <p className="font-semibold">ตั้งเวลาได้เฉพาะหลังสแกน QR ที่เครื่อง</p>
          <p className="mt-1 text-amber-100/80">ไม่สามารถกดจับเวลาจากมือถือที่ห่างจากเครื่องได้</p>
          <Link
            href="/scan"
            className="mt-4 inline-flex rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            ไปสแกน QR
          </Link>
        </div>
      )}

      {canStart && (
        <div className="mt-8 grid gap-3">
          <label className="block text-sm text-slate-300">
            ชื่อคนที่ใช้เครื่อง
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              maxLength={MAX_OWNER_NAME}
              placeholder="เช่น บี, ห้อง 302"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">
            ไม่บังคับใส่ชื่อ — ถ้าเว้นว่างจะแสดงเป็น «ไม่ระบุตัวตน» ใส่ชื่ออะไรก็ได้
          </p>
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

      {machine.status === "in_use" && isMine && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("cancel")}
          className="mt-6 w-full rounded-2xl px-4 py-4 text-base font-semibold text-rose-100 ring-1 ring-rose-300/40 hover:bg-rose-400/10 disabled:opacity-60"
        >
          ยกเลิกเวลาซัก
        </button>
      )}

      {machine.status === "in_use" && !isMine && (
        <p className="mt-8 text-sm text-slate-400">เครื่องนี้มีคนใช้อยู่ รอให้ซักเสร็จและเอาผ้าออก</p>
      )}

      {machine.status === "finished" && isMine && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("collect")}
          className="mt-8 w-full rounded-2xl bg-amber-300 px-4 py-4 text-base font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
        >
          เอาผ้าออกแล้ว · ปล่อยเครื่องว่าง
        </button>
      )}

      {machine.status === "finished" && !isMine && (
        <p className="mt-8 text-sm text-amber-100">
          รอ {displayOwnerName(machine.ownerName)} เอาผ้าออก แล้วเครื่องจะว่าง
        </p>
      )}

      {machine.status === "maintenance" && (
        <p className="mt-8 text-sm text-rose-100">
          {machine.maintenanceNote || "เครื่องนี้ปิดปรับปรุงชั่วคราว กรุณาใช้เครื่องอื่น"}
        </p>
      )}

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
