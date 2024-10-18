import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { NextRequest, NextResponse } from "next/server";
import { getMetaTags } from "./utils";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET(req: NextRequest) {
  try {
    const { url } = getUrlQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    await ratelimitOrThrow(req, "metatags");

    const metatags = await getMetaTags(url);
    return NextResponse.json(
      {
        ...metatags,
        poweredBy: "Dub.co - Link management for modern marketing teams",
      },
      {
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
