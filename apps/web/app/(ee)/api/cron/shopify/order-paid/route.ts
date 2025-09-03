import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { processOrder } from "@/lib/integrations/shopify/process-order";
import { redis } from "@/lib/upstash";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
  checkoutToken: z.string(),
});

// POST /api/cron/shopify/order-paid
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { workspaceId, checkoutToken } = schema.parse(JSON.parse(rawBody));

    // Find Shopify order
    const event = await redis.hget(
      `shopify:checkout:${checkoutToken}`,
      "order",
    );

    if (!event) {
      return new Response(
        `[Shopify] Order with checkout token ${checkoutToken} not found. Skipping...`,
      );
    }

    const clickId = await redis.hget<string>(
      `shopify:checkout:${checkoutToken}`,
      "clickId",
    );

    // clickId is empty, order is not from a Dub link
    if (clickId === "") {
      // set key to expire in 24 hours
      await redis.expire(`shopify:checkout:${checkoutToken}`, 60 * 60 * 24);

      return new Response(
        `[Shopify] Order is not from a Dub link. Skipping...`,
      );
    }

    // clickId is found, process the order for the new customer
    else if (clickId) {
      await processOrder({
        event,
        workspaceId,
        clickId,
      });

      return new Response("[Shopify] Order event processed successfully.");
    }

    // Wait for the click event to come from Shopify pixel
    else {
      throw new DubApiError({
        code: "bad_request",
        message:
          "[Shopify] Click event not found. Waiting for Shopify pixel event...",
      });
    }
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
