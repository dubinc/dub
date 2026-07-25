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
};

export const GROUP_MOVE_ATTRIBUTE_KEYS = Object.keys(
  GROUP_MOVE_ATTRIBUTES,
) as readonly (keyof typeof GROUP_MOVE_ATTRIBUTES)[];
