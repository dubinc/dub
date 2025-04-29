import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { NextRequest, NextResponse } from "next/server";
import { getMetaTags } from "./utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    // Validate the origin header and set CORS headers accordingly
    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (origin && origin.endsWith(".dub.co")) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    // Validate URL parameter
    const { url } = getUrlQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    // Rate limit by IP
    await ratelimitOrThrow(req, "metatags");

    // Get metatags
    const metatags = await getMetaTags(url);

    // Return response
    return NextResponse.json(
      {
        ...metatags,
        poweredBy: "Dub - The Modern Link Attribution Platform",
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
