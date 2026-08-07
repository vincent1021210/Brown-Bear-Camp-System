"use client";

import type {
  Attempt,
  AttemptStatus,
  CheckInResult,
  Station,
  StationPlayState,
  Team,
  TeamQrPayload,
} from "./types";

const EVENT_ID = "event-brown-bear-2026";
const EVENT_NAME = "棕熊營闖關活動";
const STORAGE_KEY = "brown-bear-camp-db-v1";
const TREASURE_CODE = "BEAR2026";

const STATION_DEFS = [
  { order: 1, name: "龍門營地跳塔", shortName: "跳塔" },
  { order: 2, name: "血跡尋寶", shortName: "尋寶" },
  {
    order: 3,
    name: "創意鑰匙圈手作",
    shortName: "鑰匙圈",
    requiresTreasureCode: true,
    treasureCode: TREASURE_CODE,
  },
  { order: 4, name: "神力布袋球積分賽", shortName: "布袋球" },
  { order: 5, name: "植物書籤", shortName: "書籤" },
  { order: 6, name: "蒙眼漫步", shortName: "漫步" },
  { order: 7, name: "捲捲棒棒糖", shortName: "棒棒糖" },
  { order: 8, name: "快問快答", shortName: "快問快答" },
] as const;

const EMBLEMS = ["龍", "虎", "鳳", "鷹", "狼", "熊", "鯊", "隼"];

interface ClientDb {
  attempts: Attempt[];
}

function stations(): Station[] {
  return STATION_DEFS.map((def) => ({
    id: `station-${def.order}`,
    name: def.name,
    shortName: def.shortName,
    order: def.order,
    eventId: EVENT_ID,
    ...("requiresTreasureCode" in def && def.requiresTreasureCode
      ? {
          requiresTreasureCode: true,
          treasureCode: TREASURE_CODE,
        }
      : {}),
  }));
}

function teams(): Team[] {
  return EMBLEMS.map((emblem, index) => ({
    id: `team-${String(index + 1).padStart(2, "0")}`,
    name: `${emblem}小隊`,
    eventId: EVENT_ID,
    emblem,
  }));
}

function gameMasters() {
  return stations().map((station) => ({
    id: `gm-${station.order}`,
    name: `第${station.order}關關主`,
    stationId: station.id,
  }));
}

function readDb(): ClientDb {
  if (typeof window === "undefined") return { attempts: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [] };
    return JSON.parse(raw) as ClientDb;
  } catch {
    return { attempts: [] };
  }
}

function writeDb(db: ClientDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function normalizeStatus(status: string): AttemptStatus | null {
  if (status === "pass" || status === "success" || status === "通過") return "pass";
  if (status === "fail" || status === "failed" || status === "不通過") return "fail";
  return null;
}

function getStationState(
  attempts: Attempt[],
  eventId: string,
  teamId: string,
  stationId: string,
): StationPlayState {
  const related = attempts
    .filter(
      (a) =>
        a.eventId === eventId &&
        a.teamId === teamId &&
        a.stationId === stationId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!related.length) return "pending";
  return normalizeStatus(related[0].status) ?? "pending";
}

function getGasUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL;
  return url ? url.replace(/\/$/, "") : null;
}

async function gasGet<T>(
  action: string,
  query: Record<string, string> = {},
): Promise<T | null> {
  const base = getGasUrl();
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  return (await res.json()) as T;
}

export async function listBootstrap() {
  const remote = await gasGet<{
    event: { id: string; name: string };
    teams: Team[];
    stations: Station[];
    gameMasters: Array<{ id: string; name: string; stationId: string }>;
  }>("bootstrap");
  if (remote?.teams) return remote;

  return {
    event: { id: EVENT_ID, name: EVENT_NAME },
    teams: teams(),
    stations: stations(),
    gameMasters: gameMasters(),
  };
}

export async function getTeamProgress(teamId: string) {
  const remote = await gasGet<{
    error?: string;
    event: { id: string; name: string };
    team: Team;
    progress: Array<{
      stationId: string;
      order: number;
      name: string;
      shortName: string;
      state: StationPlayState;
    }>;
    judgedCount: number;
    passCount: number;
    totalStations: number;
  }>("team", { teamId });

  if (remote && !remote.error) return remote;

  const team = teams().find((t) => t.id === teamId);
  if (!team) return null;
  const db = readDb();
  const progress = stations().map((station) => ({
    stationId: station.id,
    order: station.order,
    name: station.name,
    shortName: station.shortName,
    state: getStationState(db.attempts, team.eventId, team.id, station.id),
  }));
  return {
    event: { id: EVENT_ID, name: EVENT_NAME },
    team,
    progress,
    judgedCount: progress.filter((p) => p.state !== "pending").length,
    passCount: progress.filter((p) => p.state === "pass").length,
    totalStations: progress.length,
  };
}

export function parseTeamQr(raw: string): TeamQrPayload | null {
  try {
    const data = JSON.parse(raw) as TeamQrPayload;
    if (data.type === "team" && data.teamId && data.eventId) return data;
    return null;
  } catch {
    const match = raw.match(/team-[\w-]+/);
    if (match) {
      return { type: "team", teamId: match[0], eventId: EVENT_ID };
    }
    return null;
  }
}

export async function lockStation(stationId: string) {
  const remote = await gasGet<{
    ok: boolean;
    reason?: string;
    station?: Station;
    gameMaster?: { id: string; name: string; stationId: string };
    event?: { id: string; name: string };
  }>("lock", { stationId });
  if (remote) return remote;

  const station = stations().find((s) => s.id === stationId);
  if (!station) return { ok: false as const, reason: "找不到關卡" };
  const gm = gameMasters().find((g) => g.stationId === stationId);
  return {
    ok: true as const,
    station,
    gameMaster: gm,
    event: { id: EVENT_ID, name: EVENT_NAME },
  };
}

export async function checkInTeam(params: {
  teamId: string;
  stationId: string;
}): Promise<CheckInResult | { ok: false; reason: string }> {
  const remote = await gasGet<CheckInResult | { ok: false; reason: string }>(
    "checkIn",
    params,
  );
  if (remote) return remote;

  const team = teams().find((t) => t.id === params.teamId);
  const station = stations().find((s) => s.id === params.stationId);
  if (!team) return { ok: false, reason: "找不到小隊" };
  if (!station) return { ok: false, reason: "找不到關卡" };

  const state = getStationState(
    readDb().attempts,
    team.eventId,
    team.id,
    station.id,
  );
  if (state === "pass") {
    return {
      ok: true,
      canJudge: false,
      reason: "已完成，不重複計算",
      team,
      station,
      state,
      requiresTreasureCode: Boolean(station.requiresTreasureCode),
    };
  }
  return {
    ok: true,
    canJudge: true,
    team,
    station,
    state,
    requiresTreasureCode: Boolean(station.requiresTreasureCode),
  };
}

export async function verifyTreasureCode(params: {
  stationId: string;
  code: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const remote = await gasGet<{ ok: boolean; reason?: string }>("treasure", {
    stationId: params.stationId,
    code: params.code,
  });
  if (remote) return remote;

  const station = stations().find((s) => s.id === params.stationId);
  if (!station) return { ok: false, reason: "找不到關卡" };
  if (!station.requiresTreasureCode) return { ok: true };
  if (params.code.trim().toUpperCase() !== TREASURE_CODE) {
    return { ok: false, reason: "寶物 Code 不正確" };
  }
  return { ok: true };
}

export async function recordAttempt(params: {
  teamId: string;
  stationId: string;
  status: AttemptStatus;
  treasureCode?: string;
}): Promise<{ ok: true; attempt: Attempt } | { ok: false; reason: string }> {
  const remote = await gasGet<{
    ok: boolean;
    reason?: string;
    attempt?: Attempt;
  }>("complete", {
    teamId: params.teamId,
    stationId: params.stationId,
    status: params.status,
    treasureCode: params.treasureCode ?? "",
  });
  if (remote) {
    if (!remote.ok || !remote.attempt) {
      return { ok: false, reason: remote.reason ?? "紀錄失敗" };
    }
    return { ok: true, attempt: remote.attempt };
  }

  const team = teams().find((t) => t.id === params.teamId);
  const station = stations().find((s) => s.id === params.stationId);
  if (!team || !station) return { ok: false, reason: "小隊或關卡不存在" };

  const db = readDb();
  const current = getStationState(
    db.attempts,
    team.eventId,
    team.id,
    station.id,
  );
  if (current === "pass") return { ok: false, reason: "已完成，不重複計算" };

  if (station.requiresTreasureCode && params.status === "pass") {
    const verified = await verifyTreasureCode({
      stationId: station.id,
      code: params.treasureCode ?? "",
    });
    if (!verified.ok) {
      return { ok: false, reason: verified.reason ?? "寶物 Code 驗證失敗" };
    }
  }

  const attempt: Attempt = {
    id: crypto.randomUUID(),
    eventId: team.eventId,
    teamId: team.id,
    stationId: station.id,
    status: params.status,
    createdAt: new Date().toISOString(),
  };
  db.attempts.push(attempt);
  writeDb(db);
  return { ok: true, attempt };
}
