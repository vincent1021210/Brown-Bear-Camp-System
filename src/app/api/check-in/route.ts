import { NextResponse } from "next/server";
import { checkInTeam, parseTeamQr } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    stationId?: string;
    qrPayload?: string;
    teamId?: string;
  };

  if (!body.stationId) {
    return NextResponse.json({ error: "尚未鎖定關卡" }, { status: 400 });
  }

  let teamId = body.teamId;
  if (!teamId && body.qrPayload) {
    const parsed = parseTeamQr(body.qrPayload);
    if (!parsed) {
      return NextResponse.json({ error: "無法辨識小隊 QR" }, { status: 400 });
    }
    teamId = parsed.teamId;
  }

  if (!teamId) {
    return NextResponse.json({ error: "缺少小隊資訊" }, { status: 400 });
  }

  const result = await checkInTeam({ teamId, stationId: body.stationId });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(result);
}
