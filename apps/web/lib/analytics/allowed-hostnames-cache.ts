import { redis } from "@/lib/upstash";

const CACHE_EXPIRATION = 60 * 60 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = "allowedHostnamesCache";

class AllowedHostnamesCache {
  async mset({
    allowedHostnames,
    domains,
  }: {
    allowedHostnames: string;
    domains: string[];
  }) {
    if (domains.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    domains.forEach((domain) => {
      pipeline.set(this._createKey({ domain }), allowedHostnames, {
        ex: CACHE_EXPIRATION,
      });
    });

    return await pipeline.exec();
  }

  async deleteMany({ domains }: { domains: string[] }) {
    if (domains.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    domains.forEach((domain) => {
      pipeline.del(this._createKey({ domain }));
    });

    return await pipeline.exec();
  }

  async delete({ domain }: { domain: string }) {
    return await redis.del(this._createKey({ domain }));
  }

  _createKey({ domain }: { domain: string }) {
    return `${CACHE_KEY_PREFIX}:${domain}`;
  }
}

export const allowedHostnamesCache = new AllowedHostnamesCache();
