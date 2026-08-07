import { NextResponse } from "next/server";
import { recordAttempt } from "@/lib/store";
import type { AttemptStatus } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    teamId?: string;
    stationId?: string;
    status?: AttemptStatus | "success" | "failed" | "通過" | "不通過";
    treasureCode?: string;
  };

  if (!body.teamId || !body.stationId || !body.status) {
    return NextResponse.json({ error: "參數不完整" }, { status: 400 });
  }

  const map: Record<string, AttemptStatus | undefined> = {
    pass: "pass",
    fail: "fail",
    success: "pass",
    failed: "fail",
    通過: "pass",
    不通過: "fail",
  };

  const status = map[body.status];
  if (!status) {
    return NextResponse.json({ error: "狀態無效" }, { status: 400 });
  }

  const result = await recordAttempt({
    teamId: body.teamId,
    stationId: body.stationId,
    status,
    treasureCode: body.treasureCode,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(result);
}
