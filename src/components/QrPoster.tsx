"use client";

import { DORMS } from "@/lib/dorms";
import { useEffect, useState } from "react";

export type QrPosterMachine = {
  id: string;
  label: string;
  dormId: string;
  dormName: string;
  halls: string;
};

export function QrPoster({ machines }: { machines: QrPosterMachine[] }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="space-y-10">
      {DORMS.map((dorm) => {
        const list = machines.filter((item) => item.dormId === dorm.id);
        if (list.length === 0) return null;
        return (
          <section key={dorm.id} className="qr-dorm">
            <h3 className="mb-1 text-lg font-semibold text-foreground print:text-slate-900">
              {dorm.name}
            </h3>
            <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted print:text-slate-500">
              {dorm.halls} · {list.length} เครื่อง
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((machine) => {
                const payload = origin
                  ? `${origin}/machine/${machine.id}?scan=1`
                  : machine.id;
                const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
                return (
                  <figure
                    key={machine.id}
                    className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`QR ${machine.id}`} className="mx-auto h-44 w-44" />
                    <figcaption className="mt-4 text-center">
                      <p className="text-lg font-semibold">{machine.label}</p>
                      <p className="text-sm text-slate-500">
                        {machine.dormName} · {machine.id.toUpperCase()}
                      </p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
