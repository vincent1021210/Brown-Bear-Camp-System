import { NextResponse } from "next/server";
import { getTeamProgress } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await context.params;
  const data = await getTeamProgress(teamId);
  if (!data) {
    return NextResponse.json({ error: "找不到小隊" }, { status: 404 });
  }
  return NextResponse.json(data);
}
