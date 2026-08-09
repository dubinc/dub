import { createUpstashRedisPartnerSearchProvider } from "./providers/upstash-redis";
import { createUpstashSearchPartnerSearchProvider } from "./providers/upstash-search";
import type { PartnerSearchProvider } from "./types";

let upstashRedisProvider: PartnerSearchProvider | null = null;
let upstashSearchProvider: PartnerSearchProvider | null = null;

export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  const provider = process.env.PARTNER_SEARCH_PROVIDER?.trim();

  if (!provider) {
    return null;
  }

  if (provider === "upstash-redis") {
    if (!upstashRedisProvider) {
      upstashRedisProvider = createUpstashRedisPartnerSearchProvider();
    }
    return upstashRedisProvider;
  }

  if (provider === "upstash-search") {
    if (!upstashSearchProvider) {
      upstashSearchProvider = createUpstashSearchPartnerSearchProvider();
    }
    return upstashSearchProvider;
  }

  throw new Error(`Unsupported partner search provider: ${provider}`);
}
