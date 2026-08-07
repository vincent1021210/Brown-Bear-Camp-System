"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface QrScannerProps {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}

function isBenignMediaError(err: unknown): boolean {
  if (!err) return false;
  const name =
    err instanceof Error
      ? err.name
      : typeof err === "object" && err && "name" in err
        ? String((err as { name: unknown }).name)
        : "";
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
  return (
    name === "AbortError" ||
    message.includes("play() request was interrupted") ||
    message.includes("not running or paused") ||
    message.includes("Cannot stop")
  );
}

async function safeStop(scanner: Html5Qrcode | null) {
  if (!scanner) return;
  try {
    const state = scanner.getState();
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await scanner.stop();
    }
  } catch {
    // best-effort
  }
  try {
    scanner.clear();
  } catch {
    // ignore
  }
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `gm-qr-reader-${reactId}`;
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const handledRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startTokenRef = useRef(0);

  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  // Swallow camera AbortError so Next.js overlay doesn't pop
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isBenignMediaError(event.reason)) {
        event.preventDefault();
      }
    };
    const onErrorEvent = (event: ErrorEvent) => {
      if (isBenignMediaError(event.error) || isBenignMediaError(event.message)) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onErrorEvent);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onErrorEvent);
    };
  }, []);

  const stopCamera = useCallback(async () => {
    startTokenRef.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setReady(false);
    await safeStop(scanner);
    setActive(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setBusy(true);
    setCameraError(null);
    setReady(false);
    setActive(true);

    await new Promise((r) => setTimeout(r, 50));
    const token = ++startTokenRef.current;

    try {
      await safeStop(scannerRef.current);
      scannerRef.current = null;

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      handledRef.current = false;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handledRef.current) return;
          if (token !== startTokenRef.current) return;
          handledRef.current = true;
          // Stop camera before parent unmounts this component
          void (async () => {
            await safeStop(scannerRef.current);
            scannerRef.current = null;
            setActive(false);
            setReady(false);
            onScanRef.current(decoded);
          })();
        },
        () => undefined,
      );

      if (token !== startTokenRef.current) {
        await safeStop(scanner);
        return;
      }

      setReady(true);
    } catch (err: unknown) {
      if (token !== startTokenRef.current || isBenignMediaError(err)) return;
      const message =
        err instanceof Error ? err.message : "無法開啟相機，請檢查權限";
      setCameraError(message);
      onErrorRef.current?.(message);
      setActive(false);
    } finally {
      if (token === startTokenRef.current) setBusy(false);
    }
  }, [elementId]);

  useEffect(() => {
    return () => {
      startTokenRef.current += 1;
      void safeStop(scannerRef.current);
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      <div
        id={elementId}
        className={[
          "overflow-hidden rounded-2xl border border-[#f0c674]/40 bg-black",
          active ? "min-h-[240px]" : "hidden h-0 min-h-0 border-0",
        ].join(" ")}
      />

      {!active ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCamera()}
          className="w-full rounded-xl bg-[#f0c674] px-4 py-3.5 font-semibold text-[#1a1205] disabled:opacity-60"
        >
          開啟相機掃描
        </button>
      ) : (
        <>
          {!ready && !cameraError && (
            <p className="text-center text-sm text-[#9bb6d4]">正在啟動相機…</p>
          )}
          {cameraError && (
            <div className="space-y-2 text-center">
              <p className="text-sm text-[#ffb4b4]">{cameraError}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startCamera()}
                className="text-sm text-[#f0c674] underline disabled:opacity-60"
              >
                重試開啟相機
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void stopCamera()}
            className="w-full rounded-xl border border-[#f0c674]/40 px-4 py-2.5 text-sm text-[#d7e6f7] disabled:opacity-60"
          >
            關閉相機
          </button>
        </>
      )}

      <p className="text-center text-xs text-[#9bb6d4]">
        無法使用相機時，請改用下方手動輸入小隊 ID
      </p>
    </div>
  );
}
