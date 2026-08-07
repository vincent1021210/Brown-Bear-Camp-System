import { NextResponse } from "next/server";
import { verifyTreasureCode } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    stationId?: string;
    code?: string;
  };

  if (!body.stationId || !body.code) {
    return NextResponse.json({ error: "請輸入寶物 Code" }, { status: 400 });
  }

  const result = await verifyTreasureCode({
    stationId: body.stationId,
    code: body.code,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
