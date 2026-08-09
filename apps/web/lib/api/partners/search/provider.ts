import type { PartnerSearchProvider } from "./types";
import { createUpstashRedisPartnerSearchProvider } from "./upstash-redis-provider";

let upstashRedisProvider: PartnerSearchProvider | null = null;

export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  const provider = process.env.PARTNER_SEARCH_PROVIDER?.trim();

  if (!provider) {
    return null;
  }

  if (provider !== "upstash-redis") {
    throw new Error(`Unsupported partner search provider: ${provider}`);
  }

  if (!upstashRedisProvider) {
    upstashRedisProvider = createUpstashRedisPartnerSearchProvider();
  }

  return upstashRedisProvider;
}
