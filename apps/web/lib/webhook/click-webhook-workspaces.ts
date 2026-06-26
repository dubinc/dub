import { redis } from "@/lib/upstash";

export const REDIS_KEY = "webhookClickWorkspaces";

class ClickWebhookWorkspaces {
  async set(workspaceId: string): Promise<void> {
    await redis.sadd(REDIS_KEY, workspaceId);
  }

  async remove(workspaceId: string): Promise<void> {
    await redis.srem(REDIS_KEY, workspaceId);
  }
}

export const clickWebhookWorkspaces = new ClickWebhookWorkspaces();
