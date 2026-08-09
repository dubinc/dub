import { createUpstashRedisPartnerSearchProvider } from "./providers/upstash-redis";
import { createUpstashSearchPartnerSearchProvider } from "./providers/upstash-search";
import type { PartnerSearchProvider } from "./types";

let upstashRedisProvider: PartnerSearchProvider | null = null;
let upstashSearchProvider: PartnerSearchProvider | null = null;

export type PartnerSearchProviderName = "upstash-redis" | "upstash-search";

export function getPartnerSearchProviderName(): PartnerSearchProviderName | null {
  const provider = process.env.PARTNER_SEARCH_PROVIDER?.trim();

  if (!provider) {
    return null;
  }

  if (provider === "upstash-redis" || provider === "upstash-search") {
    return provider;
  }

  throw new Error(`Unsupported partner search provider: ${provider}`);
}

export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  const provider = getPartnerSearchProviderName();

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
