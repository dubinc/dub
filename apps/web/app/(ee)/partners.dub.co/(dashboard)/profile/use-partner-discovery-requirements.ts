import { getPartnerDiscoveryRequirements } from "@/lib/partners/discoverability";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { useMemo } from "react";

export function usePartnerDiscoveryRequirements() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  return useMemo(
    () =>
      partner && programEnrollments
        ? getPartnerDiscoveryRequirements({
            partner,
            totalCommissions: programEnrollments
              .filter((pe) => pe.programId !== ACME_PROGRAM_ID)
              .reduce(
                (acc, programEnrollment) =>
                  acc + programEnrollment.totalCommissions,
                0,
              ),
          })
        : undefined,
    [partner, programEnrollments],
  );
}
