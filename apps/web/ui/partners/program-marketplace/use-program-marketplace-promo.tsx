import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";

const marketplacePromoStatuses = ["banner", "card"] as const;
type MarketplacePromoStatus = (typeof marketplacePromoStatuses)[number];

export function useProgramMarketplacePromo(): {
  status: MarketplacePromoStatus;
  setStatus: (status: MarketplacePromoStatus) => void;
} {
  const [marketplacePromoStatus, setMarketplacePromoStatus] =
    useSyncedLocalStorage<string>("marketplace-promo-status", "banner");

  return {
    status:
      marketplacePromoStatuses.find(
        (status) => status === marketplacePromoStatus,
      ) ?? "banner",
    setStatus: setMarketplacePromoStatus,
  };
}
