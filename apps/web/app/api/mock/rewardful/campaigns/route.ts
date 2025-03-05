import { NextResponse } from "next/server";
import { campaigns } from "./campaigns";

export async function GET() {
  return NextResponse.json({
    data: campaigns,
  });
}
