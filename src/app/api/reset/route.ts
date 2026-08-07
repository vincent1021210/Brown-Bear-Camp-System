import { NextResponse } from "next/server";
import { resetDb } from "@/lib/store";

export async function POST() {
  const db = await resetDb();
  return NextResponse.json({
    ok: true,
    teams: db.teams.length,
    stations: db.stations.length,
  });
}
