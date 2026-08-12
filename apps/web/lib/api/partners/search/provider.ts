import { createTurbopufferPartnerSearchProvider } from "./providers/turbopuffer";
import { createUpstashRedisPartnerSearchProvider } from "./providers/upstash-redis";
import { createUpstashSearchPartnerSearchProvider } from "./providers/upstash-search";
import type { PartnerSearchProvider } from "./types";

const PARTNER_SEARCH_PROVIDER_NAMES = [
  "upstash-redis",
  "upstash-search",
  "turbopuffer",
] as const;

export type PartnerSearchProviderName =
  (typeof PARTNER_SEARCH_PROVIDER_NAMES)[number];

const providerFactories: Record<
  PartnerSearchProviderName,
  () => PartnerSearchProvider
> = {
  "upstash-redis": createUpstashRedisPartnerSearchProvider,
  "upstash-search": createUpstashSearchPartnerSearchProvider,
  turbopuffer: createTurbopufferPartnerSearchProvider,
};

const providerCache = new Map<
  PartnerSearchProviderName,
  PartnerSearchProvider
>();

export function getPartnerSearchProviderName(): PartnerSearchProviderName | null {
  const provider = process.env.PARTNER_SEARCH_PROVIDER?.trim();

  if (!provider) {
    return null;
  }

  if ((PARTNER_SEARCH_PROVIDER_NAMES as readonly string[]).includes(provider)) {
    return provider as PartnerSearchProviderName;
  }

  throw new Error(
    `Unsupported partner search provider: ${provider}. Expected one of ${PARTNER_SEARCH_PROVIDER_NAMES.join(", ")}.`,
  );
}

export function getPartnerSearchProvider(): PartnerSearchProvider | null {
  const provider = getPartnerSearchProviderName();

  if (!provider) {
    return null;
  }

  let instance = providerCache.get(provider);

  if (!instance) {
    instance = providerFactories[provider]();
    providerCache.set(provider, instance);
  }

  return instance;
}
