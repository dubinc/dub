import { PartnerProps } from "../types";
import { getNetworkApprovalRequirements } from "./get-network-approval-requirements";

export function getNetworkProfileChecklistProgress({
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
  const tasks = getNetworkApprovalRequirements({
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
