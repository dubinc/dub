import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { partnerHasEarnedCommissions } from "@/lib/network/get-discoverability-requirements";
import { getUnlocksRequirements } from "@/lib/network/get-unlocks-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useMemo } from "react";

export function usePartnerUnlocks() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  return useMemo(() => {
    if (!partner || !programEnrollments) return undefined;

    // Banner was dismissed - don't show it
    if (partner.unlocksCompletedAt) {
      return undefined;
    }

    const enrollmentProgramIds = new Set(
      programEnrollments.map((e) => e.programId),
    );
    const hasExcludedProgram = EXCLUDED_PROGRAM_IDS.some((id) =>
      enrollmentProgramIds.has(id),
    );

    // Don't show to excluded program partners who haven't earned commissions
    if (
      hasExcludedProgram &&
      !partnerHasEarnedCommissions(programEnrollments)
    ) {
      return undefined;
    }

    return getUnlocksRequirements({
      partner,
      programEnrollments,
    });
  }, [partner, programEnrollments]);
}
