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

interface LinkPartnerDiscount {
  partner: Pick<PartnerProps, "id" | "name" | "image">;
  discount: Pick<
    DiscountProps,
    "id" | "amount" | "type" | "maxDuration"
  > | null;
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

  // Cache the partner and discount
  async setPartner(
    clickId: string,
    { partner, discount }: LinkPartnerDiscount,
  ) {
    return await redis.set(
      this._createPartnerKey(clickId),
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
    return await redis.get<LinkPartnerDiscount>(
      this._createPartnerKey(clickId),
    );
  }

  _createKey({ domain, key, ip }: KeyProps) {
    return `recordClick:${domain}:${key}:${ip}`;
  }

  _createPartnerKey(clickId: string) {
    return `${PARTNER_CLICK_CACHE_KEY}:${clickId}`;
  }
}

export const clickCache = new ClickCache();
