import { openApiObject } from "@/lib/openapi";
import { NextResponse } from "next/server";
import { createDocument } from "zod-openapi";

export const runtime = "edge";

export function GET() {
  return NextResponse.json(createDocument(openApiObject));
}
