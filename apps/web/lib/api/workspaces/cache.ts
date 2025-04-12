import { redis } from "@/lib/upstash";

interface CacheProps {
  allowedHostnames: string[];
}

class WorkspaceCache {
  async set({ id, data }: { id: string; data: CacheProps }) {
    return await redis.hset(this._createKey(id), {
      ...data,
    });
  }

  async get<K extends keyof CacheProps>({
    id,
    key,
  }: {
    id: string;
    key: K;
  }): Promise<CacheProps[K] | null> {
    return await redis.hget<CacheProps[K]>(this._createKey(id), key);
  }

  async delete(id: string) {
    return await redis.del(this._createKey(id));
  }

  _createKey(id: string) {
    return `workspace:${id}`;
  }
}

export const workspaceCache = new WorkspaceCache();
