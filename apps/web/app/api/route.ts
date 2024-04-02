import { openApiObject } from "@/lib/openapi";
import { NextResponse } from "next/server";
import { createDocument } from "zod-openapi";

export const runtime = "edge";

export function GET() {
  let spec = createDocument(openApiObject)

  // spec.paths["/links"]["post"]["parameters"] = {...spec.paths["/links"]["post"]["parameters"], ...{}};

  return NextResponse.json(spec);
}
