import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import * as z from "zod/v4";
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

export const GROUP_MOVE_OPERATORS = {
  gte: WORKFLOW_OPERATORS.gte,
  between: WORKFLOW_OPERATORS.between,
};

const GROUP_MOVE_OPERATOR_KEYS = Object.keys(
  GROUP_MOVE_OPERATORS,
) as readonly (keyof typeof GROUP_MOVE_OPERATORS)[];

const groupMoveConditionSchema = z.object({
  attribute: z.enum(GROUP_MOVE_ATTRIBUTE_KEYS),
  operator: z.enum(GROUP_MOVE_OPERATOR_KEYS).default("gte"),
  value: z.union([
    z.number(),
    z.object({
      min: z.number(),
      max: z.number(),
    }),
  ]),
});

export const groupMoveRulesSchema = z.array(groupMoveConditionSchema);
