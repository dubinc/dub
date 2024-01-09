import { capitalize } from "@dub/utils";
import { PlanProps } from "../types";

export const exceededLimitError = ({
  plan,
  limit,
  type,
}: {
  plan: PlanProps;
  limit: number;
  type: "clicks" | "links" | "domains" | "tags" | "users";
}) => {
  return `You've reached your ${
    type === "links" ? "monthly" : ""
  } limit of ${limit} ${
    limit === 1 ? type.slice(0, -1) : type
  } on the ${capitalize(plan)} plan. Please upgrade to add more ${type}.`;
};
