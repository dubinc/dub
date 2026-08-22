import { processShopifyOrderJob } from "@/lib/jobs/handlers/process-shopify-order-job";
import { redis } from "@/lib/upstash";
import * as z from "zod/v4";
import { shopifyOrderSchema } from "./schema";

const SHOPIFY_CHECKOUT_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const SHOPIFY_CHECKOUT_CACHE_KEY_PREFIX = "shopify:checkout:";

const shopifyCheckoutCacheSchema = z.object({
  clickId: z.string().optional(),
  workspaceId: z.string().optional(),
  order: shopifyOrderSchema.optional(),
  dispatched: z.boolean().optional(),
});

type ShopifyCheckoutCache = z.infer<typeof shopifyCheckoutCacheSchema>;

function shopifyCheckoutCacheKey(checkoutToken: string) {
  return `${SHOPIFY_CHECKOUT_CACHE_KEY_PREFIX}${checkoutToken}`;
}

export async function writeShopifyCheckoutFields({
  checkoutToken,
  fields,
}: {
  checkoutToken: string;
  fields: Record<string, unknown>;
}) {
  const key = shopifyCheckoutCacheKey(checkoutToken);

  const pipeline = redis.pipeline();
  pipeline.hset(key, fields);
  pipeline.expire(key, SHOPIFY_CHECKOUT_CACHE_TTL_SECONDS);
  pipeline.hgetall<ShopifyCheckoutCache>(key);

  const results = await pipeline.exec();
  const cache = results[2] as ShopifyCheckoutCache | null;

  return cache ?? {};
}

export async function tryDispatchShopifyOrderJob({
  checkoutToken,
  checkout,
}: {
  checkoutToken: string;
  checkout: ShopifyCheckoutCache;
}) {
  if (!checkout.order || !checkout.workspaceId || !checkout.clickId) {
    return false;
  }

  if (checkout.dispatched) {
    return false;
  }

  // Claim the checkout
  const key = shopifyCheckoutCacheKey(checkoutToken);
  const claim = await redis.hsetnx(key, "dispatched", true);
  const claimed = Boolean(claim);

  if (!claimed) {
    return false;
  }

  await processShopifyOrderJob.dispatch(
    {
      workspaceId: checkout.workspaceId,
      clickId: checkout.clickId,
      order: checkout.order,
    },
    {
      deduplicationId: `shopify-order-${checkoutToken}`,
    },
  );

  await redis.del(key);

  return true;
}
