import { NextResponse } from "next/server";
import { listBootstrap } from "@/lib/store";

export async function GET() {
  const data = await listBootstrap();
  return NextResponse.json(data);
}
