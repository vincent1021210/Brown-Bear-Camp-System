import { NextResponse } from "next/server";
import { lockStation } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { stationId?: string };
  if (!body.stationId) {
    return NextResponse.json({ error: "請選擇關卡" }, { status: 400 });
  }

  const result = await lockStation(body.stationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(result);
}
