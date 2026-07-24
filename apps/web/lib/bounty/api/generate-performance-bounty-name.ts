import { WorkflowCondition } from "@/lib/api/workflows/types";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { currencyFormatter, nFormatter } from "@dub/utils";
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
    PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[
      condition.attribute as keyof typeof PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES
    ];
  const value =
    typeof condition.value === "number" ? condition.value : condition.value.min;
  const valueFormatted = isCurrency
    ? `${currencyFormatter(value, { trailingZeroDisplay: "stripIfInteger" })} in`
    : `${nFormatter(value, { full: true })}`;

  return `Earn ${currencyFormatter(rewardAmount, { trailingZeroDisplay: "stripIfInteger" })} after generating ${valueFormatted} ${attributeLabel.toLowerCase()}`;
};
