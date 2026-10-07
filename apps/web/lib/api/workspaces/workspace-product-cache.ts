import { redis } from "@/lib/upstash";
import { DubProduct } from "@prisma/client";

const CACHE_KEY_PREFIX = "workspace:product";
const CACHE_EXPIRATION = 60 * 60 * 24 * 30; // 30 days

class WorkspaceProductCache {
  async get({ slug }: { slug: string }) {
    return await redis.get<DubProduct>(this._createKey({ slug }));
  }

  async set({ slug, product }: { slug: string; product: DubProduct }) {
    return await redis.set(this._createKey({ slug }), product, {
      ex: CACHE_EXPIRATION,
    });
  }

  async delete({ slug }: { slug: string }) {
    return await redis.del(this._createKey({ slug }));
  }

  _createKey({ slug }: { slug: string }) {
    return `${CACHE_KEY_PREFIX}:${slug}`;
  }
}

export const workspaceProductCache = new WorkspaceProductCache();
