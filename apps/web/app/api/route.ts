import { document } from "@/lib/openapi";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(document);
}
