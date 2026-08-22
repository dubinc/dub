import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import {
  tryDispatchShopifyOrderJob,
  writeShopifyCheckoutFields,
} from "@/lib/integrations/shopify/checkout-cache";
import { getClickEvent } from "@/lib/tinybird";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

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

      if (!clickEvent) {
        clickId = null;
      }
    }

    waitUntil(
      (async () => {
        const checkout = await writeShopifyCheckoutFields({
          checkoutToken,
          fields: {
            clickId,
          },
        });

        await tryDispatchShopifyOrderJob({
          checkoutToken,
          checkout,
        });
      })(),
    );

    return NextResponse.json("OK", {
      headers: COMMON_CORS_HEADERS,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error, COMMON_CORS_HEADERS);
  }
};

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};
