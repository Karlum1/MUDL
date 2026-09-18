"use client";

import { NotificationDock } from "@/components/NotificationDock";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusGrid } from "@/components/StatusGrid";
import { useMachineLive } from "@/hooks/useMachineLive";

export default function HomePage() {
  const { machines, alerts, connected, configured, error } = useMachineLive();
  const available = machines.filter((m) => m.status === "available").length;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 lg:flex-row">
        <div className="flex-1">
          <p className="text-sm text-slate-400">ไม่ต้องสมัคร ไม่ต้องใส่ชื่อ · Anonymous</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            สถานะเครื่องซักผ้าหอพัก
          </h1>
          <p className="mt-3 max-w-xl text-slate-400">
            {machines.length === 0
              ? "รอข้อมูลจาก Firestore"
              : `ว่าง ${available} จาก ${machines.length} เครื่อง · กดการ์ดหรือสแกน QR เพื่อเริ่มจับเวลาทันที`}
          </p>

          {!configured && (
            <div className="mt-6 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
              <p className="font-semibold">ยังไม่ได้ตั้งค่า Firebase</p>
              <p className="mt-2 text-amber-100/80">
                คัดลอก <code className="font-mono text-amber-50">.env.example</code> เป็น{" "}
                <code className="font-mono text-amber-50">.env.local</code> แล้วใส่ค่า{" "}
                <code className="font-mono text-amber-50">NEXT_PUBLIC_FIREBASE_*</code> จาก
                Firebase Console จากนั้นรีสตาร์ท <code className="font-mono">npm run dev</code>
              </p>
            </div>
          )}

          {configured && error && (
            <div className="mt-6 rounded-3xl border border-rose-300/30 bg-rose-400/10 p-5 text-sm text-rose-100">
              เชื่อม Firestore ไม่ได้: {error}
            </div>
          )}

          <div className="mt-8">
            <StatusGrid machines={machines} />
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <NotificationDock alerts={alerts} />
        </div>
      </main>
    </div>
  );
}
