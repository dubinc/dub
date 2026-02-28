import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";

const stablecoinPayoutPromoStatuses = ["banner", "card"] as const;
type StablecoinPayoutPromoStatus =
  (typeof stablecoinPayoutPromoStatuses)[number];

export function useStablecoinPayoutPromo(): {
  status: StablecoinPayoutPromoStatus;
  setStatus: (status: StablecoinPayoutPromoStatus) => void;
} {
  const [stablecoinPayoutPromoStatus, setStablecoinPayoutPromoStatus] =
    useSyncedLocalStorage<string>("stablecoin-payout-promo-status", "banner");

  return {
    status:
      stablecoinPayoutPromoStatuses.find(
        (status) => status === stablecoinPayoutPromoStatus,
      ) ?? "banner",
    setStatus: setStablecoinPayoutPromoStatus,
  };
}
