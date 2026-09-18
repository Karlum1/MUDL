"use client";

import type { Machine } from "@/lib/types";
import { useEffect, useState } from "react";

export function QrPoster({ machines }: { machines: Machine[] }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {machines.map((machine) => {
        const payload = origin ? `${origin}/machine/${machine.id}` : machine.id;
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
                {machine.id.toUpperCase()} · ชั้น {machine.floor}
              </p>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
