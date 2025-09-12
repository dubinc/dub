import { WorkflowCondition } from "@/lib/types";
import { WORKFLOW_ATTRIBUTE_LABELS } from "@/lib/zod/schemas/workflows";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { isCurrencyAttribute } from "../workflows/utils";

export const generateBountyName = ({
  condition,
}: {
  condition: WorkflowCondition;
}) => {
  const isCurrency = isCurrencyAttribute(condition.attribute);
  const attributeLabel = WORKFLOW_ATTRIBUTE_LABELS[condition.attribute];
  const valueFormatted = isCurrency
    ? `${currencyFormatter(condition.value / 100, { trailingZeroDisplay: "stripIfInteger" })} in`
    : `${nFormatter(condition.value, { full: true })}`;

  return `Generate ${valueFormatted} ${attributeLabel.toLowerCase()}`;
};
