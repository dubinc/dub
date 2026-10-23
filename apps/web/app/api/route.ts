import { document } from "@/lib/openapi";
import { getMcpDocument } from "@/lib/openapi/mcp-document";
import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const isMcp = req.nextUrl.searchParams.has("mcp");
  const openapiDocument = isMcp ? getMcpDocument() : document;

  return NextResponse.json(openapiDocument, {
    headers: {
      // cache indefinitely till next deployment
      "Vercel-CDN-Cache-Control": "s-maxage=31536000",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
