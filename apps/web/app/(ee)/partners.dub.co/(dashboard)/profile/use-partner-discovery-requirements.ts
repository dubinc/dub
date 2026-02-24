import { getPartnerProfileChecklistProgress } from "@/lib/network/get-partner-profile-checklist-progress";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useMemo } from "react";

export function usePartnerDiscoveryRequirements() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  return useMemo(() => {
    if (!partner || !programEnrollments) return undefined;

    const checklistProgress = getPartnerProfileChecklistProgress({
      partner,
    });

    return checklistProgress.tasks;
  }, [partner, programEnrollments]);
}
