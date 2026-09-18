"use client";

import { QrPoster } from "@/components/QrPoster";
import { SiteHeader } from "@/components/SiteHeader";
import { useMachineLive } from "@/hooks/useMachineLive";

export default function QrCodesPage() {
  const { machines, connected } = useMachineLive();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-white">QR สำหรับติดเครื่อง</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          พิมพ์หน้านี้แล้วติดที่เครื่องซักผ้า แต่ละรหัสพานักศึกษาไปหน้าเริ่มซักของเครื่องนั้นทันที
        </p>
        <div className="mt-8">
          <QrPoster machines={machines} />
        </div>
      </main>
    </div>
  );
}
