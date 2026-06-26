import { redis } from "@/lib/upstash";

export const REDIS_KEY = "webhookClickWorkspaces";

class ClickWebhookWorkspaces {
  async set(workspaceId: string) {
    return await redis.sadd(REDIS_KEY, workspaceId);
  }

  async remove(workspaceId: string) {
    return await redis.srem(REDIS_KEY, workspaceId);
  }

  async has(workspaceId: string) {
    return await redis.sismember(REDIS_KEY, workspaceId);
  }
}

export const clickWebhookWorkspaces = new ClickWebhookWorkspaces();
