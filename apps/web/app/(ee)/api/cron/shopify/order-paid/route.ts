import { DubApiError } from "@/lib/api/errors";
import { withCron } from "@/lib/cron/with-cron";
import { shopifyCheckoutCache } from "@/lib/integrations/shopify/checkout-cache";
import { processShopifyOrderJob } from "@/lib/jobs/handlers/process-shopify-order-job";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  workspaceId: z.string(),
  checkoutToken: z.string(),
});

const MAX_PIXEL_WAIT_RETRIES = 5;

// POST /api/cron/shopify/order-paid
// Cutover shim for in-flight QStash messages with the old
// { workspaceId, checkoutToken } body. Remove after a week.
export const POST = withCron(async ({ req, rawBody }) => {
  const { workspaceId, checkoutToken } = schema.parse(JSON.parse(rawBody));

  const checkout = await shopifyCheckoutCache.get(checkoutToken);

  if (!checkout.order) {
    return logAndRespond(
      `[Shopify] Order with checkout token ${checkoutToken} not found. Skipping...`,
    );
  }

  const { clickId, order } = checkout;

  // clickId is empty, order is not from a Dub link
  if (clickId === "") {
    await shopifyCheckoutCache.delete(checkoutToken);
    return logAndRespond(`[Shopify] Order is not from a Dub link. Skipping...`);
  }

  // clickId is found, process the order for the new customer
  if (clickId) {
    await processShopifyOrderJob.execute({
      workspaceId,
      clickId,
      order,
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
