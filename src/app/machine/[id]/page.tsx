"use client";

import { MachineActions } from "@/components/MachineActions";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/components/AppProviders";
import { useMachineLive } from "@/hooks/useMachineLive";
import { t } from "@/lib/i18n";
import { hasValidMachineScan } from "@/lib/session";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MachinePageInner() {
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { machines, connected, error, uid } = useMachineLive({ machineId: params.id });
  const machine = machines.find((item) => item.id === params.id);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    if (searchParams.get("scan") === "1") {
      router.replace(`/machine/${id}`);
    }
    setScanned(hasValidMachineScan(id));
  }, [params.id, searchParams, router]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader connected={connected} />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <Link href="/" className="text-sm text-accent hover:opacity-80">
          {t(locale, "backDash")}
        </Link>
        <div className="mt-6">
          {!machine ? (
            <div className="rounded-3xl border border-line bg-surface p-6 text-muted">
              {error === "FIREBASE_NOT_CONFIGURED"
                ? t(locale, "setupFirebaseFirst")
                : !connected
                  ? t(locale, "loadingMachine")
                  : t(locale, "machineMissing")}
            </div>
          ) : (
            <MachineActions machine={machine} uid={uid} scanned={scanned} />
          )}
        </div>
      </main>
    </div>
  );
}

function MachineFallback() {
  const locale = useLocale();
  return (
    <div className="flex min-h-full items-center justify-center text-muted">
      {t(locale, "loadingMachine")}
    </div>
  );
}

export default function MachinePage() {
  return (
    <Suspense fallback={<MachineFallback />}>
      <MachinePageInner />
    </Suspense>
  );
}
