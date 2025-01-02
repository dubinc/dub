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
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const { workspaceId, checkoutToken } = schema.parse(body);

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

    // Wait for the click event to come from Shopify pixel
    if (!clickId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "[Shopify] Click event not found. Waiting for Shopify pixel event...",
      });
    }

    await processOrder({
      event,
      workspaceId,
      clickId,
    });

    await redis.del(`shopify:checkout:${checkoutToken}`);

    return new Response("[Shopify] Order event processed successfully.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
