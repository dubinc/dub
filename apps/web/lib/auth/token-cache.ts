import { redis } from "@/lib/upstash";
import { z } from "zod";

const CACHE_EXPIRATION = 60 * 60 * 24; // 24 hours
const CACHE_KEY_PREFIX = "tokenCache";

const tokenCacheItemSchema = z.object({
  scopes: z.string().nullish(),
  rateLimit: z.number().nullish(),
  projectId: z.string().nullish(),
  expires: z.date().nullish(),
  installationId: z.string().nullish(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    isMachine: z.boolean(),
  }),
});

type TokenCacheItem = z.infer<typeof tokenCacheItemSchema>;

// Cache for restricted tokens (and legacy personal tokens)
class TokenCache {
  async set({
    hashedKey,
    token,
  }: {
    hashedKey: string;
    token: TokenCacheItem;
  }) {
    return await redis.set(
      this._createKey({ hashedKey }),
      JSON.stringify(tokenCacheItemSchema.parse(token)),
      {
        ex: CACHE_EXPIRATION,
      },
    );
  }

  async get({ hashedKey }: { hashedKey: string }) {
    return await redis.get<TokenCacheItem>(this._createKey({ hashedKey }));
  }

  async delete({ hashedKey }: { hashedKey: string }) {
    return await redis.del(this._createKey({ hashedKey }));
  }

  async expireMany({ hashedKeys }: { hashedKeys: string[] }) {
    if (hashedKeys.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    hashedKeys.forEach((hashedKey) => {
      pipeline.expire(this._createKey({ hashedKey }), 1);
    });

    return await pipeline.exec();
  }

  _createKey({ hashedKey }: { hashedKey: string }) {
    return `${CACHE_KEY_PREFIX}:${hashedKey}`;
  }
}

export const tokenCache = new TokenCache();
