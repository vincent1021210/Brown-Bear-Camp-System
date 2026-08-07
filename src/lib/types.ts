export type AttemptStatus = "pass" | "fail";

export type StationPlayState = "pending" | "pass" | "fail";

export interface EventInfo {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  eventId: string;
  emblem: string;
}

export interface Station {
  id: string;
  name: string;
  shortName: string;
  order: number;
  eventId: string;
  requiresTreasureCode?: boolean;
  treasureCode?: string;
}

export interface GameMaster {
  id: string;
  name: string;
  stationId: string;
}

export interface Attempt {
  id: string;
  eventId: string;
  teamId: string;
  stationId: string;
  status: AttemptStatus;
  createdAt: string;
}

export interface Database {
  event: EventInfo;
  teams: Team[];
  stations: Station[];
  gameMasters: GameMaster[];
  attempts: Attempt[];
}

export interface TeamQrPayload {
  type: "team";
  eventId: string;
  teamId: string;
}

export interface CheckInResult {
  ok: boolean;
  canJudge: boolean;
  reason?: string;
  team: Team;
  station: Station;
  state: StationPlayState;
  requiresTreasureCode: boolean;
}
