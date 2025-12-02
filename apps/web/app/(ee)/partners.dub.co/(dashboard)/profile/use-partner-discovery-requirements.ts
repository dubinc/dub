import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import {
  getDiscoverabilityRequirements,
  partnerHasEarnedCommissions,
} from "@/lib/partners/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useMemo } from "react";

export function usePartnerDiscoveryRequirements() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  return useMemo(() => {
    if (!partner || !programEnrollments) return undefined;

    const enrollmentProgramIds = new Set(
      programEnrollments.map((e) => e.programId),
    );
    const hasExcludedProgram = EXCLUDED_PROGRAM_IDS.some((id) =>
      enrollmentProgramIds.has(id),
    );

    if (
      hasExcludedProgram &&
      !partnerHasEarnedCommissions(programEnrollments)
    ) {
      return undefined;
    }

    return getDiscoverabilityRequirements({
      partner,
      programEnrollments,
    });
  }, [partner, programEnrollments]);
}
