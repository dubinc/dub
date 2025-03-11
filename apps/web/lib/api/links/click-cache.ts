import { redis } from "@/lib/upstash";

// Cache the click ID in Redis for 1 hour
const CACHE_EXPIRATION = 60 * 60;

interface KeyProps {
  domain: string;
  key: string;
  ip: string | undefined;
}

class ClickCache {
  async set({ domain, key, ip, clickId }: KeyProps & { clickId: string }) {
    return await redis.set(this._createKey({ domain, key, ip }), clickId, {
      ex: CACHE_EXPIRATION,
    });
  }

  async get({ domain, key, ip }: KeyProps) {
    return await redis.get<string>(this._createKey({ domain, key, ip }));
  }

  _createKey({ domain, key, ip }: KeyProps) {
    return `recordClick:${domain}:${key}:${ip}`;
  }
}

export const clickCache = new ClickCache();
