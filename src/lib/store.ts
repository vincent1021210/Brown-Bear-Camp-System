import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  Attempt,
  AttemptStatus,
  CheckInResult,
  Database,
  StationPlayState,
  TeamQrPayload,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const STATION_DEFS = [
  { order: 1, name: "龍門營地跳塔", shortName: "跳塔" },
  { order: 2, name: "血跡尋寶", shortName: "尋寶" },
  { order: 3, name: "創意鑰匙圈手作", shortName: "鑰匙圈", treasure: true },
  { order: 4, name: "神力布袋球積分賽", shortName: "布袋球" },
  { order: 5, name: "植物書籤", shortName: "書籤" },
  { order: 6, name: "蒙眼漫步", shortName: "漫步" },
  { order: 7, name: "捲捲棒棒糖", shortName: "棒棒糖" },
  { order: 8, name: "快問快答", shortName: "快問快答" },
] as const;

function createSeed(): Database {
  const eventId = "event-brown-bear-2026";

  const stations = STATION_DEFS.map((def) => ({
    id: `station-${def.order}`,
    name: def.name,
    shortName: def.shortName,
    order: def.order,
    eventId,
    ...("treasure" in def && def.treasure
      ? { requiresTreasureCode: true, treasureCode: "BEAR2026" }
      : {}),
  }));

  const emblems = ["龍", "虎", "鳳", "鷹", "狼", "熊", "鯊", "隼"];
  const teams = emblems.map((emblem, index) => ({
    id: `team-${String(index + 1).padStart(2, "0")}`,
    name: `${emblem}小隊`,
    eventId,
    emblem,
  }));

  const gameMasters = stations.map((station) => ({
    id: `gm-${station.order}`,
    name: `第${station.order}關關主`,
    stationId: station.id,
  }));

  return {
    event: { id: eventId, name: "棕熊營闖關活動" },
    teams,
    stations,
    gameMasters,
    attempts: [],
  };
}

async function readDb(): Promise<Database> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as Database;
    // Migrate if old seed without shortName
    if (!db.stations?.[0] || !("shortName" in db.stations[0])) {
      const seed = createSeed();
      await writeDb(seed);
      return seed;
    }
    return db;
  } catch {
    const seed = createSeed();
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function resetDb(): Promise<Database> {
  const seed = createSeed();
  await writeDb(seed);
  return seed;
}

function normalizeStatus(status: string): AttemptStatus | null {
  if (status === "pass" || status === "success") return "pass";
  if (status === "fail" || status === "failed") return "fail";
  return null;
}

export function getStationState(
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

  if (related.length === 0) return "pending";

  const latest = normalizeStatus(related[0].status);
  if (latest) return latest;

  // legacy fallback
  if (related.some((a) => normalizeStatus(a.status) === "pass")) return "pass";
  if (related.some((a) => normalizeStatus(a.status) === "fail")) return "fail";
  return "pending";
}

export async function getTeamProgress(teamId: string) {
  const db = await readDb();
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) return null;

  const stations = [...db.stations].sort((a, b) => a.order - b.order);
  const progress = stations.map((station) => ({
    stationId: station.id,
    order: station.order,
    name: station.name,
    shortName: station.shortName,
    state: getStationState(db.attempts, team.eventId, team.id, station.id),
  }));

  const judgedCount = progress.filter((p) => p.state !== "pending").length;
  const passCount = progress.filter((p) => p.state === "pass").length;

  return {
    event: db.event,
    team,
    progress,
    judgedCount,
    passCount,
    totalStations: stations.length,
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
      return {
        type: "team",
        teamId: match[0],
        eventId: "event-brown-bear-2026",
      };
    }
    return null;
  }
}

export async function checkInTeam(params: {
  teamId: string;
  stationId: string;
}): Promise<CheckInResult | { ok: false; reason: string }> {
  const db = await readDb();
  const team = db.teams.find((t) => t.id === params.teamId);
  const station = db.stations.find((s) => s.id === params.stationId);

  if (!team) return { ok: false, reason: "找不到小隊" };
  if (!station) return { ok: false, reason: "找不到關卡" };
  if (team.eventId !== station.eventId) {
    return { ok: false, reason: "小隊與關卡不屬於同一活動" };
  }

  const state = getStationState(
    db.attempts,
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
  const db = await readDb();
  const station = db.stations.find((s) => s.id === params.stationId);
  if (!station) return { ok: false, reason: "找不到關卡" };
  if (!station.requiresTreasureCode) return { ok: true };
  if (params.code.trim().toUpperCase() !== station.treasureCode) {
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
  const db = await readDb();
  const team = db.teams.find((t) => t.id === params.teamId);
  const station = db.stations.find((s) => s.id === params.stationId);

  if (!team || !station) return { ok: false, reason: "小隊或關卡不存在" };

  const current = getStationState(
    db.attempts,
    team.eventId,
    team.id,
    station.id,
  );
  if (current === "pass") {
    return { ok: false, reason: "已完成，不重複計算" };
  }

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
    id: randomUUID(),
    eventId: team.eventId,
    teamId: team.id,
    stationId: station.id,
    status: params.status,
    createdAt: new Date().toISOString(),
  };

  db.attempts.push(attempt);
  await writeDb(db);
  return { ok: true, attempt };
}

export async function listBootstrap() {
  const db = await readDb();
  return {
    event: db.event,
    teams: db.teams,
    stations: [...db.stations].sort((a, b) => a.order - b.order),
    gameMasters: db.gameMasters,
  };
}

export async function lockStation(stationId: string) {
  const db = await readDb();
  const station = db.stations.find((s) => s.id === stationId);
  if (!station) return { ok: false as const, reason: "找不到關卡" };
  const gm = db.gameMasters.find((g) => g.stationId === stationId);
  return {
    ok: true as const,
    station,
    gameMaster: gm ?? {
      id: `gm-${station.order}`,
      name: `第${station.order}關關主`,
      stationId: station.id,
    },
    event: db.event,
  };
}
