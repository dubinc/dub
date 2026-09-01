import { DubApiError } from "@/lib/api/errors";
import { withCron } from "@/lib/cron/with-cron";
import { shopifyOrderSchema } from "@/lib/integrations/shopify/schema";
import { processShopifyOrderJob } from "@/lib/jobs/handlers/process-shopify-order-job";
import { redis } from "@/lib/upstash";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
  checkoutToken: z.string(),
});

// Matches the old qstash.publishJSON({ retries: 5 }) for this route.
const MAX_PIXEL_WAIT_RETRIES = 5;

// Cutover shim: drains in-flight QStash messages with the old
// { workspaceId, checkoutToken } body.

// POST /api/cron/shopify/order-paid
export const POST = withCron(async ({ req, rawBody }) => {
  const { workspaceId, checkoutToken } = schema.parse(JSON.parse(rawBody));

  // Find Shopify order
  const event = await redis.hget(`shopify:checkout:${checkoutToken}`, "order");

  if (!event) {
    return logAndRespond(
      `[Shopify] Order with checkout token ${checkoutToken} not found. Skipping...`,
    );
  }

  const clickId = await redis.hget<string>(
    `shopify:checkout:${checkoutToken}`,
    "clickId",
  );

  // clickId is empty, order is not from a Dub link
  if (clickId === "") {
    await redis.del(`shopify:checkout:${checkoutToken}`);
    return logAndRespond(`[Shopify] Order is not from a Dub link. Skipping...`);
  }

  // clickId is found, process the order for the new customer
  if (clickId) {
    await processShopifyOrderJob.execute({
      workspaceId,
      clickId,
      order: shopifyOrderSchema.parse(event),
    });

    return logAndRespond("[Shopify] Order event processed successfully.");
  }

  const retried = Number(req.headers.get("Upstash-Retried") ?? "0");

  // Give up waiting for the pixel after a few QStash attempts (2xx stops retries)
  if (retried >= MAX_PIXEL_WAIT_RETRIES) {
    return logAndRespond(
      `[Shopify] Click event not found after ${retried} retries for checkout ${checkoutToken}. Skipping...`,
    );
  }

  // Wait for the click event to come from Shopify pixel
  throw new DubApiError({
    code: "bad_request",
    message:
      "[Shopify] Click event not found. Waiting for Shopify pixel event...",
  });
});
