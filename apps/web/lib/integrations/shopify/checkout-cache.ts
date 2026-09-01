import { processShopifyOrderJob } from "@/lib/jobs/handlers/process-shopify-order-job";
import { redis } from "@/lib/upstash";
import * as z from "zod/v4";
import { shopifyOrderSchema } from "./schema";

const SHOPIFY_CHECKOUT_CACHE_TTL_SECONDS = 60 * 60; // 1 hours
const SHOPIFY_CHECKOUT_CACHE_KEY_PREFIX = "shopify:checkout:";

const shopifyCheckoutCacheSchema = z.object({
  clickId: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  workspaceId: z.string().optional(),
  order: shopifyOrderSchema.optional(),
  dispatched: z.boolean().optional(),
});

type ShopifyCheckoutCacheItem = z.infer<typeof shopifyCheckoutCacheSchema>;

class ShopifyCheckoutCache {
  async get(checkoutToken: string): Promise<ShopifyCheckoutCacheItem> {
    const cache = await redis.hgetall(this.createKey(checkoutToken));
    return this.parse(cache);
  }

  async set({
    checkoutToken,
    fields,
  }: {
    checkoutToken: string;
    fields: Partial<ShopifyCheckoutCacheItem>;
  }): Promise<ShopifyCheckoutCacheItem> {
    const key = this.createKey(checkoutToken);

    const pipeline = redis.pipeline();
    pipeline.hset(key, fields);
    pipeline.expire(key, SHOPIFY_CHECKOUT_CACHE_TTL_SECONDS);
    pipeline.hgetall(key);

    const results = await pipeline.exec();
    return this.parse(results[2]);
  }

  async delete(checkoutToken: string) {
    return await redis.del(this.createKey(checkoutToken));
  }

  createKey(checkoutToken: string) {
    return `${SHOPIFY_CHECKOUT_CACHE_KEY_PREFIX}${checkoutToken}`;
  }

  parse(cache: unknown): ShopifyCheckoutCacheItem {
    const parsed = shopifyCheckoutCacheSchema.safeParse(cache);
    return parsed.success ? parsed.data : shopifyCheckoutCacheSchema.parse({});
  }
}

export const shopifyCheckoutCache = new ShopifyCheckoutCache();

export async function tryDispatchShopifyOrderJob({
  checkoutToken,
  checkout,
}: {
  checkoutToken: string;
  checkout: ShopifyCheckoutCacheItem;
}) {
  if (!checkout.order || !checkout.workspaceId || !checkout.clickId) {
    return false;
  }

  if (checkout.dispatched) {
    return false;
  }

  // Claim the checkout
  const key = shopifyCheckoutCache.createKey(checkoutToken);
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

  await shopifyCheckoutCache.delete(checkoutToken);

  return true;
}
