import { getDiscoverabilityRequirements } from "@/lib/partners/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useMemo } from "react";

export function usePartnerDiscoveryRequirements() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  return useMemo(
    () =>
      partner && programEnrollments
        ? getDiscoverabilityRequirements({
            partner,
            programEnrollments,
          })
        : undefined,
    [partner, programEnrollments],
  );
}
