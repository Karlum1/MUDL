"use client";

import { ScanIcon } from "@/components/ScanIcon";
import { useLocale } from "@/components/AppProviders";
import { isMachineId } from "@/lib/dorms";
import { t, type MessageKey } from "@/lib/i18n";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

function parseMachineId(value: string) {
  try {
    const url = new URL(value);
    const fromPath = url.pathname.split("/").filter(Boolean);
    const maybe = fromPath[fromPath.length - 1]?.toLowerCase();
    if (maybe && isMachineId(maybe)) return maybe;
  } catch {
    /* not a URL */
  }
  const match = value.toLowerCase().match(/(?:put|int|chai|kan|lee|sri)-(?:wm|dr)-\d{2}|wm-\d{2}/);
  return match && isMachineId(match[0]) ? match[0] : null;
}

export function QrScanner({ onDetect }: { onDetect: (id: string) => void }) {
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const stopRef = useRef<(() => void) | null>(null);
  const [cameraError, setCameraError] = useState<MessageKey | null>(null);
  const [scanning, setScanning] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const startCamera = useCallback(async () => {
    stopRef.current?.();
    if (!videoRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("cameraUnsupported");
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    let frame = 0;

    stopRef.current = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video || cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      setScanning(true);
      setNeedsTap(false);
      setCameraError(null);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const detector =
        "BarcodeDetector" in window ? new BarcodeDetector({ formats: ["qr_code"] }) : null;

      const loop = async () => {
        if (cancelled) return;
        try {
          let raw: string | null = null;
          if (detector) {
            const codes = await detector.detect(video);
            raw = codes[0]?.rawValue ?? null;
          } else if (ctx && video.readyState >= 2) {
            frame += 1;
            if (frame % 3 === 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              raw = jsQR(image.data, image.width, image.height)?.data ?? null;
            }
          }
          const id = raw ? parseMachineId(raw) : null;
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
      setScanning(false);
      setNeedsTap(true);
      setCameraError("cameraNeedTap");
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopRef.current?.();
  }, [startCamera]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-line bg-black">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover sm:aspect-video"
          muted
          playsInline
          autoPlay
        />
        <p className="px-4 py-3 text-center text-xs text-muted">
          {scanning ? t(locale, "scanning") : cameraError ? t(locale, cameraError) : ""}
        </p>
      </div>
      {needsTap && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-4 text-base font-semibold text-accent-fg hover:bg-accent-hover"
        >
          <ScanIcon className="h-5 w-5" />
          {t(locale, "openCamera")}
        </button>
      )}
    </div>
  );
}
