import { capitalize } from "@dub/utils";
import { PlanPeriod } from "@prisma/client";
import { PlanProps } from "./types";

export const exceededLimitError = ({
  plan,
  planPeriod,
  limit,
  type,
}: {
  plan: PlanProps;
  planPeriod?: PlanPeriod | null;
  limit: number;
  type: "clicks" | "links" | "domains" | "tags" | "folders" | "users" | "AI";
}) => {
  const periodSpecificResources = ["clicks", "links", "AI"];

  // planPeriod is null for workspaces without a billing period (e.g. free plans),
  // whose limits reset monthly
  const period = planPeriod ?? "monthly";

  const upgradeMessage =
    periodSpecificResources.includes(type) && period === "monthly"
      ? "Go yearly for 12x usage upfront, or upgrade for higher limits."
      : "Please upgrade for higher limits.";

  return `You've reached your${periodSpecificResources.includes(type) ? ` ${period}` : ""} limit of ${limit} ${limit === 1 ? type.slice(0, -1) : type} on the ${capitalize(plan)} plan. ${upgradeMessage}`;
};
