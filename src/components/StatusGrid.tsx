"use client";

import { MachineCard } from "@/components/MachineCard";
import type { Machine } from "@/lib/types";

export function StatusGrid({ machines }: { machines: Machine[] }) {
  const floors = [1, 2];

  if (machines.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center text-slate-400">
        กำลังโหลดสถานะเครื่องซักผ้า...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {floors.map((floor) => {
        const floorMachines = machines.filter((m) => m.floor === floor);
        return (
          <section key={floor}>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              ชั้น {floor} · Floor {floor}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {floorMachines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
