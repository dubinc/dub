import { PartnerProps } from "../types";
import { getNetworkApprovalRequirements } from "./get-network-approval-requirements";

export function getNetworkProfileChecklistProgress({
  partner,
}: {
  partner?: Pick<
    PartnerProps,
    | "image"
    | "description"
    | "monthlyTraffic"
    | "preferredEarningStructures"
    | "salesChannels"
    | "platforms"
  >;
}) {
  if (!partner) {
    return {
      tasks: [],
      completedCount: 0,
      totalCount: 0,
      isComplete: false,
    };
  }

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
