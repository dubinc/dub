import { capitalize, currencyFormatter } from "@dub/utils";
import { PlanProps } from "./types";

export const exceededLimitError = ({
  plan,
  limit,
  type,
}: {
  plan: PlanProps;
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
  return `You've reached your ${
    ["links", "AI", "payouts"].includes(type) ? "monthly" : ""
  } limit of ${
    type === "payouts"
      ? currencyFormatter(limit)
      : `${limit} ${limit === 1 ? type.slice(0, -1) : type}`
  } on the ${capitalize(plan)} plan. Please upgrade for higher limits.`;
};
