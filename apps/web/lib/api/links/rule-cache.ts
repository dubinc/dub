import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { LRUCache } from "lru-cache";
import { ExpandedLink } from "./utils/transform-link";

/**
 * Cache for redirect rules (wildcard/pattern-based links).
 * Rules are cached per domain to enable efficient pattern matching fallback
 * when exact link matches are not found.
 */

// LRU cache to reduce Redis load - max 500 domains with 30-second TTL
const ruleLRUCache = new LRUCache<string, RedisLinkProps[]>({
  max: 500,
  ttl: 30000, // 30 seconds
});

// Redis cache expiration: 1 hour for rules
export const RULE_CACHE_EXPIRATION = 60 * 60;

export type RedisRuleLink = RedisLinkProps & {
  rulePattern: string;
};

class RuleCache {
  /**
   * Set all rules for a domain in cache
   */
  async set(domain: string, rules: ExpandedLink[]) {
    if (rules.length === 0) {
      return;
    }

    const redisRules = rules.map((rule) => ({
      ...formatRedisLink(rule),
      rulePattern: rule.rulePattern!,
    }));

    const cacheKey = this._createKey(domain);

    // Update LRU cache
    ruleLRUCache.set(cacheKey, redisRules);

    // Store in Redis
    return await redis.set(cacheKey, redisRules, { ex: RULE_CACHE_EXPIRATION });
  }

  /**
   * Get all rules for a domain
   */
  async get(domain: string): Promise<RedisRuleLink[] | null> {
    const cacheKey = this._createKey(domain);

    // Check LRU cache first
    let cachedRules = ruleLRUCache.get(cacheKey) as RedisRuleLink[] | undefined;

    if (cachedRules) {
      console.log(`[Rule LRU Cache HIT] ${cacheKey}`);
      return cachedRules;
    }

    console.log(`[Rule LRU Cache MISS] ${cacheKey} - Checking Redis...`);

    try {
      cachedRules = await redis.get<RedisRuleLink[]>(cacheKey);

      if (cachedRules) {
        console.log(
          `[Rule Redis Cache HIT] ${cacheKey} - Populating LRU cache...`,
        );
        ruleLRUCache.set(cacheKey, cachedRules);
      }

      return cachedRules || null;
    } catch (error) {
      console.error("[RuleCache] - Error getting rules from Redis:", error);
      return null;
    }
  }

  /**
   * Delete all rules for a domain (used when rules are updated)
   */
  async delete(domain: string) {
    const cacheKey = this._createKey(domain);
    ruleLRUCache.delete(cacheKey);
    return await redis.del(cacheKey);
  }

  /**
   * Invalidate cache when a rule is added/updated/deleted
   */
  async invalidate(domain: string) {
    return await this.delete(domain);
  }

  _createKey(domain: string) {
    return `rulecache:${domain.toLowerCase()}`;
  }
}

export const ruleCache = new RuleCache();
