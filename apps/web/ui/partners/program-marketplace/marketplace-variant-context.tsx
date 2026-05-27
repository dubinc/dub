"use client";

import { createContext, useContext, type ReactNode } from "react";

export type MarketplaceVariant = "internal" | "external";

const MarketplaceVariantContext = createContext<MarketplaceVariant>("internal");

export function MarketplaceVariantProvider({
  variant,
  children,
}: {
  variant: MarketplaceVariant;
  children: ReactNode;
}) {
  return (
    <MarketplaceVariantContext.Provider value={variant}>
      {children}
    </MarketplaceVariantContext.Provider>
  );
}

export function useMarketplaceVariant() {
  return useContext(MarketplaceVariantContext);
}
