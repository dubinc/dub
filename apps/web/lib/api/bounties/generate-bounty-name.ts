import { WorkflowCondition } from "@/lib/types";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { isCurrencyAttribute } from "../workflows/utils";

export const generateBountyName = ({
  rewardAmount,
  condition,
}: {
  rewardAmount: number;
  condition?: WorkflowCondition | null;
}) => {
  if (!condition) {
    return `Earn ${currencyFormatter(rewardAmount / 100)}`;
  }

  const isCurrency = isCurrencyAttribute(condition.attribute);
  const rewardAmountFormatted = currencyFormatter(rewardAmount / 100);
  const attributeLabel = WORKFLOW_ATTRIBUTE_LABELS[condition.attribute];
  const valueFormatted = isCurrency
    ? `${currencyFormatter(condition.value / 100)} in`
    : `${nFormatter(condition.value, { full: true })}`;

  return `Earn ${rewardAmountFormatted} after generating ${valueFormatted} ${attributeLabel}`;
};
