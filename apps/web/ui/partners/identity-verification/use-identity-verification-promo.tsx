import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";

const identityVerificationPromoStatuses = ["banner", "card"] as const;
type IdentityVerificationPromoStatus =
  (typeof identityVerificationPromoStatuses)[number];

export function useIdentityVerificationPromo(): {
  status: IdentityVerificationPromoStatus;
  setStatus: (status: IdentityVerificationPromoStatus) => void;
} {
  const [identityVerificationPromoStatus, setIdentityVerificationPromoStatus] =
    useSyncedLocalStorage<string>(
      "identity-verification-promo-status",
      "banner",
    );

  return {
    status:
      identityVerificationPromoStatuses.find(
        (status) => status === identityVerificationPromoStatus,
      ) ?? "banner",
    setStatus: setIdentityVerificationPromoStatus,
  };
}
