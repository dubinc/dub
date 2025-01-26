import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getClickEvent } from "@/lib/tinybird";
import { ratelimit, redis } from "@/lib/upstash";
import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// POST /api/shopify/pixel – Handle the Shopify Pixel events
export const POST = async (req: Request) => {
  try {
    let { clickId, checkoutToken } = await parseRequestBody(req);

    if (!checkoutToken) {
      throw new DubApiError({
        code: "bad_request",
        message: "checkoutToken is required.",
      });
    }

    // Rate limit the request
    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    const { success } = await ratelimit().limit(`shopify-track-pixel:${ip}`);

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }

    // Validate the clickId if provided
    if (clickId) {
      const clickEvent = await getClickEvent({ clickId });

      if (!clickEvent || clickEvent.data.length === 0) {
        clickId = null;
      }
    }

    waitUntil(
      redis.hset(`shopify:checkout:${checkoutToken}`, {
        clickId: clickId || "",
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
