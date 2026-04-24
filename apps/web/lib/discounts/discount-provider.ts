import { DiscountProvider } from "@dub/prisma/client";
import { shopifyDiscountProvider } from "./discount-provider-shopify";
import { stripeDiscountProvider } from "./discount-provider-stripe";

const discountProviders = {
  stripe: stripeDiscountProvider,
  shopify: shopifyDiscountProvider,
} as const;

export function getDiscountProvider(name: DiscountProvider) {
  const provider = discountProviders[name];

  if (!provider) {
    throw new Error(`Unsupported provider: ${name}`);
  }

  return provider;
}
