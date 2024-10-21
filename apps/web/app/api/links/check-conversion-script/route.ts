import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { fetchWithTimeout } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { url } = getUrlQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    await ratelimitOrThrow(req, "check-conversion-script");

    // ping URL to see if the dubcdn.com/analytics/script.js script is installed
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Dub.co",
      },
    });

    if (res.status !== 200) {
      throw new Error(`Failed to fetch ${url}`);
    }

    const html = await res.text();

    const installed = html.includes("dubcdn.com/analytics/script.js");

    return NextResponse.json({ installed });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
