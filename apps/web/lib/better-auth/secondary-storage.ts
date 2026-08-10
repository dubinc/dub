import { redis } from "@/lib/upstash";
import type { BetterAuthOptions } from "better-auth";

const KEY_PREFIX = "ba:";

function prefixedKey(key: string) {
  return `${KEY_PREFIX}${key}`;
}

function toStorageString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export const secondaryStorage = {
  async get(key) {
    try {
      const value = await redis.get(prefixedKey(key));
      return toStorageString(value);
    } catch (error) {
      console.error("[BetterAuth] secondaryStorage.get error:", error);
      return null;
    }
  },

  async set(key, value, ttl) {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);
    const redisKey = prefixedKey(key);

    if (ttl) {
      await redis.set(redisKey, stringValue, { ex: ttl });
      return;
    }

    await redis.set(redisKey, stringValue);
  },

  async delete(key) {
    await redis.del(prefixedKey(key));
  },

  async increment(key, ttl) {
    const redisKey = prefixedKey(key);
    const count = await redis.incr(redisKey);

    if (count === 1 && ttl > 0) {
      await redis.expire(redisKey, ttl);
    }

    return count;
  },
} satisfies NonNullable<BetterAuthOptions["secondaryStorage"]>;
