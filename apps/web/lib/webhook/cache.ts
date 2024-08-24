import { redis } from "@/lib/upstash";
import type { Webhook } from "@prisma/client";
import { WEBHOOK_REDIS_KEY } from "./constants";

type WebhookCacheProps = Pick<Webhook, "id" | "url" | "secret" | "triggers">;

class WebhookCache {
  async set(webhook: WebhookCacheProps) {
    return await redis.hset(WEBHOOK_REDIS_KEY, {
      [webhook.id]: this.format(webhook),
    });
  }

  async get(webhookId: string) {
    return await redis.hget<WebhookCacheProps>(WEBHOOK_REDIS_KEY, webhookId);
  }

  async delete(webhookId: string) {
    return await redis.hdel(WEBHOOK_REDIS_KEY, webhookId);
  }

  format(webhook: WebhookCacheProps) {
    return {
      url: webhook.url,
      secret: webhook.secret,
      triggers: webhook.triggers,
    };
  }
}

export const webhookCache = new WebhookCache();
