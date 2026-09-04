import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { parseRequestBody } from "@/lib/api/utils";
import {
  shopifyCheckoutCache,
  tryDispatchShopifyOrderJob,
} from "@/lib/integrations/shopify/checkout-cache";
import { getClickEvent } from "@/lib/tinybird";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress, waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const inputSchema = z.object({
  clickId: z.string().nullish(),
  checkoutToken: z.string().nullish(),
  shopDomain: z.string().nullish(),
});

// POST /api/shopify/pixel – Handle the Shopify Pixel events
export const POST = async (req: Request) => {
  const response = NextResponse.json("OK", {
    headers: COMMON_CORS_HEADERS,
  });

  try {
    const { clickId, checkoutToken, shopDomain } = inputSchema.parse(
      await parseRequestBody(req),
    );

    console.info("Shopify pixel event", {
      clickId,
      checkoutToken,
      shopDomain,
    });

    if (!checkoutToken) {
      console.error("Missing checkoutToken. Skipping the request...");
      return response;
    }

    if (!clickId) {
      console.error("Missing clickId. Skipping the request...");
      return response;
    }

    // Rate limit the request
    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    const { success } = await ratelimit().limit(`shopify-track-pixel:${ip}`);

    if (!success) {
      console.error("Rate limit exceeded. Skipping the request...");
      return response;
    }

    // Get the click event
    const clickEvent = await getClickEvent({ clickId });
    if (!clickEvent) {
      console.error("Click event not found. Skipping the request...");
      return response;
    }

    waitUntil(
      (async () => {
        const checkout = await shopifyCheckoutCache.set({
          checkoutToken,
          fields: { clickId },
        });

        await tryDispatchShopifyOrderJob({
          checkoutToken,
          checkout,
        });
      })(),
    );

    return response;
  } catch (error) {
    console.error("Error processing Shopify pixel event", error);
    return response;
  }
};

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};
