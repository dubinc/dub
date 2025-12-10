import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";

const partnerRewindStatuses = ["banner", "card"] as const;
type PartnerRewindStatus = (typeof partnerRewindStatuses)[number];

export function usePartnerRewindStatus(): {
  status: PartnerRewindStatus;
  setStatus: (status: PartnerRewindStatus) => void;
} {
  const [status, setStatus] = useSyncedLocalStorage<string>(
    "partner-rewind-status",
    "banner",
  );

  return {
    status: partnerRewindStatuses.find((s) => s === status) ?? "banner",
    setStatus,
  };
}
