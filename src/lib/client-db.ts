"use client";

import {
  EVENT_ID,
  EVENT_NAME,
  STATION_DEFS,
  TEAM_EMBLEMS,
} from "./stations";
import type {
  Attempt,
  AttemptStatus,
  CheckInResult,
  Station,
  StationPlayState,
  Team,
  TeamQrPayload,
} from "./types";

const STORAGE_KEY = "brown-bear-camp-db-v2-rain";

function stations(): Station[] {
  return STATION_DEFS.map((def) => ({
    id: `station-${def.order}`,
    name: def.name,
    shortName: def.shortName,
    order: def.order,
    eventId: EVENT_ID,
  }));
}

function teams(): Team[] {
  return TEAM_EMBLEMS.map((emblem, index) => ({
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

interface ClientDb {
  attempts: Attempt[];
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

let cachedGasUrl: string | null | undefined;

async function resolveGasUrl(): Promise<string | null> {
  if (cachedGasUrl !== undefined) return cachedGasUrl;

  const fromEnv = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL?.replace(/\/$/, "");
  if (fromEnv) {
    cachedGasUrl = fromEnv;
    return cachedGasUrl;
  }

  if (typeof window !== "undefined") {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/gas-config.json`, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { gasWebAppUrl?: string };
        const url = json.gasWebAppUrl?.replace(/\/$/, "") || null;
        cachedGasUrl = url;
        return cachedGasUrl;
      }
    } catch {
      // ignore and fall through
    }
  }

  cachedGasUrl = null;
  return null;
}

// #region agent log
function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  fetch("http://127.0.0.1:7908/ingest/2d491511-48b4-4493-8ed2-49380a7c93af", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d92e6d",
    },
    body: JSON.stringify({
      sessionId: "d92e6d",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => undefined);
}
// #endregion

async function gasGet<T>(
  action: string,
  query: Record<string, string> = {},
): Promise<T | null> {
  const base = await resolveGasUrl();
  if (!base) {
    // #region agent log
    debugLog("A", "client-db.ts:gasGet", "no GAS url, local fallback", {
      action,
      query,
    });
    // #endregion
    return null;
  }
  const url = new URL(base);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = (await res.json()) as T;
    // #region agent log
    debugLog("B", "client-db.ts:gasGet", "GAS response", {
      action,
      query,
      okHttp: res.ok,
      status: res.status,
      remoteKeys: json && typeof json === "object" ? Object.keys(json as object) : [],
    });
    // #endregion
    return json;
  } catch (err) {
    // #region agent log
    debugLog("B", "client-db.ts:gasGet", "GAS fetch failed", {
      action,
      query,
      error: String(err),
    });
    // #endregion
    throw err;
  }
}

export async function listBootstrap() {
  const remote = await gasGet<{
    event: { id: string; name: string };
    teams: Team[];
    stations: Station[];
    gameMasters: Array<{ id: string; name: string; stationId: string }>;
  }>("bootstrap");
  if (remote?.teams?.length && remote?.stations?.length) return remote;

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

  if (remote && !remote.error) {
    // #region agent log
    debugLog("C", "client-db.ts:getTeamProgress", "progress from GAS", {
      teamId,
      passCount: remote.passCount,
      states: remote.progress?.map((p) => ({
        stationId: p.stationId,
        state: p.state,
      })),
    });
    // #endregion
    return remote;
  }

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
  // #region agent log
  debugLog("A", "client-db.ts:getTeamProgress", "progress from localStorage", {
    teamId,
    attemptCount: db.attempts.length,
    storageKey: STORAGE_KEY,
    states: progress.map((p) => ({ stationId: p.stationId, state: p.state })),
    passCount: progress.filter((p) => p.state === "pass").length,
  });
  // #endregion
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
      requiresTreasureCode: false,
    };
  }
  return {
    ok: true,
    canJudge: true,
    team,
    station,
    state,
    requiresTreasureCode: false,
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
  void params;
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
    // #region agent log
    debugLog("B", "client-db.ts:recordAttempt", "complete via GAS", {
      teamId: params.teamId,
      stationId: params.stationId,
      status: params.status,
      ok: remote.ok,
      reason: remote.reason ?? null,
      attemptStatus: remote.attempt?.status ?? null,
    });
    // #endregion
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
  // #region agent log
  debugLog("A", "client-db.ts:recordAttempt", "complete via localStorage", {
    teamId: team.id,
    stationId: station.id,
    status: params.status,
    attemptCount: db.attempts.length,
    storageKey: STORAGE_KEY,
  });
  // #endregion
  return { ok: true, attempt };
}

/** 回復為未完成：清除該小隊該關所有判定紀錄 */
export async function undoAttempt(params: {
  teamId: string;
  stationId: string;
}): Promise<{ ok: true; removed: number } | { ok: false; reason: string }> {
  const remote = await gasGet<{
    ok: boolean;
    reason?: string;
    removed?: number;
  }>("undo", {
    teamId: params.teamId,
    stationId: params.stationId,
  });
  if (remote) {
    if (!remote.ok) {
      return { ok: false, reason: remote.reason ?? "回復失敗" };
    }
    return { ok: true, removed: remote.removed ?? 0 };
  }

  const team = teams().find((t) => t.id === params.teamId);
  const station = stations().find((s) => s.id === params.stationId);
  if (!team || !station) return { ok: false, reason: "小隊或關卡不存在" };

  const db = readDb();
  const before = db.attempts.length;
  db.attempts = db.attempts.filter(
    (a) =>
      !(
        a.eventId === team.eventId &&
        a.teamId === team.id &&
        a.stationId === station.id
      ),
  );
  writeDb(db);
  return { ok: true, removed: before - db.attempts.length };
}
