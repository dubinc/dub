import { redis } from "@/lib/upstash";
import { WebhookCacheProps } from "../types";
import { WEBHOOK_REDIS_KEY } from "./constants";

class WebhookCache {
  async set(webhook: WebhookCacheProps) {
    return await redis.hset(WEBHOOK_REDIS_KEY, {
      [webhook.id]: this.format(webhook),
    });
  }

  async get(webhookId: string) {
    return await redis.hget<WebhookCacheProps>(WEBHOOK_REDIS_KEY, webhookId);
  }

  async mget(webhookIds: string[]) {
    const webhooks = await redis.hmget<Record<string, WebhookCacheProps>>(
      WEBHOOK_REDIS_KEY,
      ...webhookIds,
    );

    if (!webhooks) {
      return [];
    }

    return Object.values(webhooks);
  }

  async delete(webhookId: string) {
    return await redis.hdel(WEBHOOK_REDIS_KEY, webhookId);
  }

  format(webhook: WebhookCacheProps) {
    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      triggers: webhook.triggers,
      ...(webhook.disabledAt && { disabledAt: webhook.disabledAt }),
    };
  }
}

export const webhookCache = new WebhookCache();
