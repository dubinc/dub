import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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

// POST /api/track/shopify – Track a Shopify event
export const POST = async (req: Request) => {
  try {
    const { clickId, checkoutToken } = await parseRequestBody(req);

    if (!clickId || !checkoutToken) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing clickId or checkoutToken",
      });
    }

    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/shopify/checkout-completed`,
        body: {
          clickId,
          checkoutToken,
        },
        retries: 5,
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
