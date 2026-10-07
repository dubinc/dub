import { document } from "@/lib/openapi";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(document, {
    headers: {
      // cache indefinitely till next deployment
      "Vercel-CDN-Cache-Control": "s-maxage=31536000",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
