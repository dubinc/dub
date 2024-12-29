import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getClickEvent } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// TODO:
// Add rate limiting
// Finalize the endpoint (Maybe move to /api/shopify/pixel)

// POST /api/track/shopify – Handle the Shopify Pixel events
export const POST = async (req: Request) => {
  try {
    const { clickId, checkoutToken } = await parseRequestBody(req);

    if (!clickId || !checkoutToken) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing clickId or checkoutToken",
      });
    }

    const clickEvent = await getClickEvent({ clickId });

    if (!clickEvent || clickEvent.data.length === 0) {
      return new Response(
        `[Shopify] Click event not found for clickId: ${clickId}`,
      );
    }

    waitUntil(
      redis.hset(`shopify:checkout:${checkoutToken}`, {
        clickId,
      }),
    );

    return NextResponse.json("OK", {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
};

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
