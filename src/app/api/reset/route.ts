import { NextResponse } from "next/server";
import { resetDb } from "@/lib/store";

export async function POST() {
  try {
    const result = await resetDb();
    return NextResponse.json({
      ok: true,
      teams: result.teams ?? 8,
      stations: result.stations ?? 8,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "重置失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
