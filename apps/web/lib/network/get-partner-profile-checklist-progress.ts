import { PartnerProps } from "../types";
import { getDiscoverabilityRequirements } from "./get-discoverability-requirements";

export function getPartnerProfileChecklistProgress({
  partner,
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
}) {
  const tasks = getDiscoverabilityRequirements({
    partner,
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
