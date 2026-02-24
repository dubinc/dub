import { EnrolledPartnerProps, PartnerProps } from "../types";
import { getDiscoverabilityRequirements } from "./get-discoverability-requirements";

export function getPartnerProfileChecklistProgress({
  partner,
  programEnrollments,
}: {
  partner: Pick<
    PartnerProps,
    | "image"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "platforms"
  >;
  programEnrollments: Pick<
    EnrolledPartnerProps,
    "programId" | "status" | "totalCommissions"
  >[];
}) {
  const tasks = getDiscoverabilityRequirements({
    partner,
    programEnrollments,
  });

  const completedCount = tasks.filter(({ completed }) => completed).length;
  const totalCount = tasks.length;

  return {
    tasks,
    completedCount,
    totalCount,
    isComplete: completedCount === totalCount,
  };
}
