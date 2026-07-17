import { capitalize, currencyFormatter } from "@dub/utils";
import { PlanPeriod } from "@prisma/client";
import { PlanProps } from "./types";

export const exceededLimitError = ({
  plan,
  planPeriod = "monthly",
  limit,
  type,
}: {
  plan: PlanProps;
  planPeriod: PlanPeriod | null;
  limit: number;
  type:
    | "clicks"
    | "payouts"
    | "links"
    | "domains"
    | "tags"
    | "folders"
    | "groups"
    | "users"
    | "AI";
}) => {
  const periodSpecificResources = ["clicks", "links", "payouts", "AI"];

  const upgradeMessage =
    periodSpecificResources.includes(type) && planPeriod === "monthly"
      ? "Go yearly for 12x usage upfront, or upgrade for higher limits."
      : "Please upgrade for higher limits.";

  return `You've reached your${periodSpecificResources.includes(type) ? ` ${planPeriod}` : ""} limit of ${
    type === "payouts"
      ? currencyFormatter(limit)
      : `${limit} ${limit === 1 ? type.slice(0, -1) : type}`
  } on the ${capitalize(plan)} plan. ${upgradeMessage}`;
};
