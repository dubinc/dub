import { WorkflowCondition } from "@/lib/types";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { isCurrencyAttribute } from "../workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "./performance-bounty-scope-attributes";

export const generatePerformanceBountyName = ({
  rewardAmount,
  condition,
}: {
  rewardAmount: number;
  condition: WorkflowCondition;
}) => {
  const isCurrency = isCurrencyAttribute(condition.attribute);
  const attributeLabel =
    PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[condition.attribute];
  const valueFormatted = isCurrency
    ? `${currencyFormatter(condition.value / 100, { trailingZeroDisplay: "stripIfInteger" })} in`
    : `${nFormatter(condition.value, { full: true })}`;

  return `Earn ${currencyFormatter(rewardAmount / 100, { trailingZeroDisplay: "stripIfInteger" })} after generating ${valueFormatted} ${attributeLabel.toLowerCase()}`;
};
