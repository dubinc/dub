import { redisGlobal } from "@/lib/upstash";

// Cache the click ID in Redis for 1 hour
const CACHE_EXPIRATION = 60 * 60;

interface KeyProps {
  domain: string;
  key: string;
  identityHash: string;
}

class RecordClickCache {
  async set({
    domain,
    key,
    identityHash,
    clickId,
  }: KeyProps & { clickId: string }) {
    return await redisGlobal.set(
      this._createKey({ domain, key, identityHash }),
      clickId,
      {
        ex: CACHE_EXPIRATION,
      },
    );
  }

  async get({ domain, key, identityHash }: KeyProps) {
    return await redisGlobal.get<string>(
      this._createKey({ domain, key, identityHash }),
    );
  }

  _createKey({ domain, key, identityHash }: KeyProps) {
    return `recordClick:${domain}:${key}:${identityHash}`;
  }
}

export const recordClickCache = new RecordClickCache();
