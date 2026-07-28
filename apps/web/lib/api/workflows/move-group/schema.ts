import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import { WORKFLOW_ATTRIBUTES } from "../attribute-definitions";

export const GROUP_MOVE_ATTRIBUTES = {
  totalLeads: {
    ...WORKFLOW_ATTRIBUTES.totalLeads,
    operators: ["gte", "between"] as const,
  },
  totalConversions: {
    ...WORKFLOW_ATTRIBUTES.totalConversions,
    operators: ["gte", "between"] as const,
  },
  totalSaleAmount: {
    ...WORKFLOW_ATTRIBUTES.totalSaleAmount,
    operators: ["gte", "between"] as const,
  },
  totalCommissions: {
    ...WORKFLOW_ATTRIBUTES.totalCommissions,
    operators: ["gte", "between"] as const,
  },
  partnerGroup: WORKFLOW_ATTRIBUTES.partnerGroup,
};

export const GROUP_MOVE_ATTRIBUTE_KEYS = Object.keys(
  GROUP_MOVE_ATTRIBUTES,
) as readonly (keyof typeof GROUP_MOVE_ATTRIBUTES)[];

export const GROUP_MOVE_METRIC_ATTRIBUTE_KEYS =
  GROUP_MOVE_ATTRIBUTE_KEYS.filter(
    (
      key,
    ): key is Exclude<
      (typeof GROUP_MOVE_ATTRIBUTE_KEYS)[number],
      "partnerGroup"
    > => key !== "partnerGroup",
  );

export const GROUP_MOVE_OPERATORS = {
  gte: WORKFLOW_OPERATORS.gte,
  between: WORKFLOW_OPERATORS.between,
  eq: WORKFLOW_OPERATORS.eq,
  ne: WORKFLOW_OPERATORS.ne,
  in: WORKFLOW_OPERATORS.in,
  notIn: WORKFLOW_OPERATORS.notIn,
};
