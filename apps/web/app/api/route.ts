import { document } from "@/lib/openapi";
import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET() {
  return NextResponse.json(document);
}
