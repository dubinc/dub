import { openApiObject } from "@/lib/openapi";
import { NextResponse } from "next/server";
import { createDocument } from "zod-openapi";

export function GET() {
  return NextResponse.json(createDocument(openApiObject));
}
