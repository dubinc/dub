import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { NextRequest, NextResponse } from "next/server";
import { getMetaTags } from "./utils";

export const runtime = "edge";

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
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
