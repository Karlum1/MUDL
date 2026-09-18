"use client";

import { QrScanner } from "@/components/QrScanner";
import { SiteHeader } from "@/components/SiteHeader";
import { useMachineLive } from "@/hooks/useMachineLive";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function ScanPage() {
  const router = useRouter();
  const { machines, connected } = useMachineLive();
  const onDetect = useCallback(
    (id: string) => {
      router.push(`/machine/${id}`);
    },
    [router],
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-white">สแกน QR เครื่องซักผ้า</h1>
        <p className="mt-2 text-slate-400">
          ส่องไปที่สติ๊กเกอร์เครื่อง หรือกดจำลองการสแกนถ้ายังไม่มีกล้อง
        </p>
        <div className="mt-8">
          <QrScanner machines={machines} onDetect={onDetect} />
        </div>
      </main>
    </div>
  );
}
