import { RedisLinkProps } from "@/lib/types";
import { LRUCache } from "lru-cache";

/*
 * LRU cache for link middleware to reduce Redis load during traffic spikes.
 * Max 5000 entries with 60-second TTL.
 *
 * In development, we store the cache in globalThis to prevent HMR from resetting it.
 */
const globalForLruCache = globalThis as unknown as {
  lruCache: LRUCache<string, RedisLinkProps> | undefined;
};

export const lruCache =
  globalForLruCache.lruCache ??
  new LRUCache<string, RedisLinkProps>({
    max: 5000,
    ttl: 60000, // 60 seconds
  });

if (process.env.NODE_ENV !== "production") {
  globalForLruCache.lruCache = lruCache;
}
