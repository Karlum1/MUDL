"use client";

import { MachineActions } from "@/components/MachineActions";
import { SiteHeader } from "@/components/SiteHeader";
import { useMachineLive } from "@/hooks/useMachineLive";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function MachinePage() {
  const params = useParams<{ id: string }>();
  const { machines, connected, error, uid } = useMachineLive();
  const machine = machines.find((item) => item.id === params.id);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← กลับแดชบอร์ด
        </Link>
        <div className="mt-6">
          {!machine ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
              {machines.length === 0
                ? error === "FIREBASE_NOT_CONFIGURED"
                  ? "ตั้งค่า Firebase ใน .env.local ก่อน"
                  : "กำลังโหลดเครื่อง..."
                : "ไม่พบเครื่องนี้ ตรวจ QR อีกครั้ง"}
            </div>
          ) : (
            <MachineActions machine={machine} uid={uid} />
          )}
        </div>
      </main>
    </div>
  );
}
