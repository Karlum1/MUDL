"use client";

import type { Machine } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

function parseMachineId(value: string) {
  try {
    const url = new URL(value);
    const fromPath = url.pathname.split("/").filter(Boolean);
    const maybe = fromPath[fromPath.length - 1];
    if (maybe?.startsWith("wm-")) return maybe;
  } catch {
    /* not a URL */
  }
  const match = value.toLowerCase().match(/wm-\d{2}/);
  return match?.[0] ?? null;
}

export function QrScanner({
  machines,
  onDetect,
}: {
  machines: Machine[];
  onDetect: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    async function start() {
      if (!("BarcodeDetector" in window) || !videoRef.current) {
        setCameraError("กล้องสแกน QR ใช้ได้บน Chrome / Edge — หรือเลือกเครื่องด้านล่าง");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setScanning(true);
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        const loop = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            const id = codes.map((c) => parseMachineId(c.rawValue)).find(Boolean);
            if (id) {
              onDetectRef.current(id);
              return;
            }
          } catch {
            /* keep scanning */
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setCameraError("ไม่สามารถเปิดกล้องได้ — ใช้ตัวจำลองด้านล่างแทน");
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover sm:aspect-video" muted playsInline />
        <p className="px-4 py-3 text-center text-xs text-slate-400">
          {scanning ? "กำลังสแกน QR..." : cameraError}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
          จำลองการสแกน · Simulator
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {machines.map((machine) => (
            <button
              key={machine.id}
              type="button"
              onClick={() => onDetect(machine.id)}
              className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-4 text-left hover:border-cyan-300/40"
            >
              <p className="text-sm font-semibold text-white">{machine.label}</p>
              <p className="text-xs text-slate-400">{machine.id.toUpperCase()}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
