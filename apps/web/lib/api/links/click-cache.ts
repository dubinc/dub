import { DiscountProps, PartnerProps } from "@/lib/types";
import { redis } from "@/lib/upstash";

// Cache the click ID in Redis for 1 hour
const CACHE_EXPIRATION = 60 * 60;
const PARTNER_CLICK_CACHE_KEY = "partner:click";

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

  // Cache the partner and discount
  async setPartner(
    clickId: string,
    {
      partner,
      discount,
    }: {
      partner: Pick<PartnerProps, "id" | "name" | "image">;
      discount?: Pick<DiscountProps, "id" | "amount" | "type" | "maxDuration">;
    },
  ) {
    return await redis.set(
      `${PARTNER_CLICK_CACHE_KEY}:${clickId}`,
      {
        partner,
        discount,
      },
      {
        ex: CACHE_EXPIRATION,
      },
    );
  }

  // Get the partner and discount
  async getPartner(clickId: string) {
    return await redis.get<{
      partner: Pick<PartnerProps, "id" | "name" | "image">;
      discount?: Pick<DiscountProps, "id" | "amount" | "type" | "maxDuration">;
    }>(`${PARTNER_CLICK_CACHE_KEY}:${clickId}`);
  }
}

export const clickCache = new ClickCache();
