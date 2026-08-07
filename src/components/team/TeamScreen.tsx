"use client";

import { QRCodeSVG } from "qrcode.react";
import type { StationPlayState, TeamQrPayload } from "@/lib/types";

interface StationCardProps {
  order: number;
  name: string;
  state: StationPlayState;
}

function StationCard({ order, name, state }: StationCardProps) {
  const isDark = state === "pending";
  const isPass = state === "pass";
  // pending / fail 都顯示「不通過」；通過才顯示「通過」
  const statusLabel = isPass ? "通過" : "不通過";

  return (
    <div
      className={[
        "station-card relative flex aspect-[3/4] flex-col items-center justify-between rounded-[14px] border px-1 py-2.5 transition-all duration-500",
        isDark
          ? "border-[#c4a574]/45 bg-transparent"
          : isPass
            ? "border-[#f0c674] bg-[#f0c674]/18 shadow-[0_0_18px_rgba(240,198,116,0.65),0_0_4px_rgba(240,198,116,0.9)]"
            : "border-[#f0c674] bg-[#f0c674]/14 shadow-[0_0_14px_rgba(240,198,116,0.45)]",
      ].join(" ")}
    >
      <span
        className={[
          "text-[15px] font-semibold leading-none",
          isDark ? "text-[#c4a574]/55" : "text-[#f0c674]",
        ].join(" ")}
      >
        {order}
      </span>

      <span
        className={[
          "px-0.5 text-center text-[11px] leading-snug font-medium",
          isDark ? "text-[#c4a574]/50" : "text-[#ffe7a8]",
        ].join(" ")}
      >
        {name}
      </span>

      <span
        className={[
          "text-[12px] font-bold tracking-wide",
          isDark
            ? "text-[#c4a574]/45"
            : isPass
              ? "text-[#f0c674]"
              : "text-[#ffb4b4]",
        ].join(" ")}
      >
        {statusLabel}
      </span>
    </div>
  );
}

interface TeamScreenProps {
  teamName: string;
  qrPayload: TeamQrPayload;
  progress: Array<{
    stationId: string;
    order: number;
    name: string;
    state: StationPlayState;
  }>;
  passCount: number;
  totalStations: number;
}

export function TeamScreen({
  teamName,
  qrPayload,
  progress,
  passCount,
  totalStations,
}: TeamScreenProps) {
  return (
    <div className="team-screen mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-12">
      <header className="mb-6 text-center">
        <p className="text-xs tracking-[0.25em] text-[#9bb6d4]">{teamName}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-wide text-[#f0c674]">
          你的闖關進度
        </h1>
      </header>

      <section className="grid grid-cols-4 gap-2.5">
        {progress.map((item) => (
          <StationCard
            key={item.stationId}
            order={item.order}
            name={item.name}
            state={item.state}
          />
        ))}
      </section>

      <section className="mt-8 flex flex-1 flex-col items-center">
        <p className="mb-4 text-center text-sm font-medium text-[#f0c674]">
          掃描小隊 QR Code 開始闖關！
        </p>
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG
            value={JSON.stringify(qrPayload)}
            size={210}
            level="M"
            includeMargin={false}
          />
        </div>
      </section>

      <footer className="mt-8">
        <div className="rounded-xl border border-[#5bc0de]/80 bg-transparent px-4 py-3 text-center text-white">
          完成度 {passCount}/{totalStations}
        </div>
      </footer>
    </div>
  );
}
