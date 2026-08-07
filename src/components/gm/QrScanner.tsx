"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface QrScannerProps {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}

async function safeStop(scanner: Html5Qrcode) {
  try {
    const state = scanner.getState();
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await scanner.stop();
    }
  } catch {
    // ignore stop errors when camera never fully started
  }

  try {
    scanner.clear();
  } catch {
    // ignore clear errors
  }
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `gm-qr-reader-${reactId}`;
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const handledRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    handledRef.current = false;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    async function start() {
      try {
        scanner = new Html5Qrcode(elementId);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            onScanRef.current(decoded);
          },
          () => undefined,
        );

        if (cancelled) {
          await safeStop(scanner);
          return;
        }

        setReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "無法開啟相機，請檢查權限";
        setCameraError(message);
        onErrorRef.current?.(message);
      }
    }

    void start();

    return () => {
      cancelled = true;
      setReady(false);
      if (scanner) {
        void safeStop(scanner);
      }
    };
  }, [elementId]);

  return (
    <div className="w-full">
      <div
        id={elementId}
        className="overflow-hidden rounded-2xl border border-[#f0c674]/40 bg-black"
      />
      {!ready && !cameraError && (
        <p className="mt-3 text-center text-sm text-[#9bb6d4]">正在啟動相機…</p>
      )}
      {cameraError && (
        <div className="mt-3 space-y-2 text-center">
          <p className="text-sm text-[#ffb4b4]">{cameraError}</p>
          <p className="text-xs text-[#9bb6d4]">
            若無法使用相機，請改用下方手動輸入小隊 ID
          </p>
        </div>
      )}
    </div>
  );
}
