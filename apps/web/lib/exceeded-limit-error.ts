import { capitalize, currencyFormatter } from "@dub/utils";
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
  type:
    | "clicks"
    | "links"
    | "AI"
    | "domains"
    | "tags"
    | "users"
    | "folders"
    | "payouts"
    | "groups";
}) => {
  const period = ["links", "AI", "payouts"].includes(type)
    ? planPeriod === "yearly"
      ? "yearly"
      : "monthly"
    : null;

  const upgradeMessage =
    type === "payouts"
      ? planPeriod === "yearly"
        ? "Upgrade for higher limits."
        : "Go yearly for 12x usage upfront, or upgrade for higher limits."
      : "Please upgrade for higher limits.";

  return `You've reached your${period ? ` ${period}` : ""} limit of ${
    type === "payouts"
      ? currencyFormatter(limit)
      : `${limit} ${limit === 1 ? type.slice(0, -1) : type}`
  } on the ${capitalize(plan)} plan. ${upgradeMessage}`;
};
