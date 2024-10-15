import { redis } from "@/lib/upstash";
import { WebhookCacheProps } from "../types";
import { isLinkLevelWebhook } from "./utils";

const WEBHOOK_CACHE_KEY_PREFIX = "webhook";

class WebhookCache {
  async set(webhook: WebhookCacheProps) {
    if (!isLinkLevelWebhook(webhook)) {
      return;
    }

    return await redis.set(
      this._getCacheKey(webhook.id),
      JSON.stringify(this._format(webhook)),
    );
  }

  async mget(webhookIds: string[]) {
    const webhooks = await redis.mget<WebhookCacheProps[]>(
      webhookIds.map(this._getCacheKey),
    );

    return webhooks.filter(Boolean);
  }

  async delete(webhookId: string) {
    return await redis.del(this._getCacheKey(webhookId));
  }

  _format(webhook: WebhookCacheProps) {
    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      triggers: webhook.triggers,
      ...(webhook.disabledAt && { disabledAt: webhook.disabledAt }),
    };
  }

  _getCacheKey(webhookId: string) {
    return `${WEBHOOK_CACHE_KEY_PREFIX}:${webhookId}`;
  }
}

export const webhookCache = new WebhookCache();
