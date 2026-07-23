import * as z from "zod/v4";

export const GROUP_MOVE_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
] as const;

export const GROUP_MOVE_OPERATORS = ["gte", "between"] as const;

export const GROUP_MOVE_ATTRIBUTE_CONFIG: Record<
  GroupMoveAttribute,
  GroupMoveAttributeConfig
> = {
  totalLeads: {
    label: "total leads",
    inputType: "number",
    operators: ["gte", "between"],
  },
  totalConversions: {
    label: "total conversions",
    inputType: "number",
    operators: ["gte", "between"],
  },
  totalSaleAmount: {
    label: "total revenue",
    inputType: "currency",
    operators: ["gte", "between"],
  },
  totalCommissions: {
    label: "total commissions",
    inputType: "currency",
    operators: ["gte", "between"],
  },
};

export const GROUP_MOVE_OPERATOR_LABELS: Record<GroupMoveOperator, string> = {
  gte: "more than",
  between: "between",
} as const;

export const groupMoveConditionSchema = z.object({
  attribute: z.enum(GROUP_MOVE_ATTRIBUTES),
  operator: z.enum(GROUP_MOVE_OPERATORS).default("gte"),
  value: z.union([
    z.number(),
    z.object({
      min: z.number(),
      max: z.number(),
    }),
  ]),
});

export const groupMoveRulesSchema = z.array(groupMoveConditionSchema);

export const GROUP_MOVE_OPERATOR_VALIDATORS = {
  gte(rule: GroupMoveCondition, ruleIndex: number) {
    if (
      typeof rule.value !== "number" ||
      isNaN(rule.value) ||
      rule.value <= 0
    ) {
      throw new Error(
        `Rule ${ruleIndex + 1}: Please enter a value greater than 0.`,
      );
    }
  },

  between(rule: GroupMoveCondition, ruleIndex: number) {
    if (typeof rule.value !== "object" || rule.value === null) {
      throw new Error(`Rule ${ruleIndex + 1}: Please enter a valid value.`);
    }

    const min = rule.value.min;
    const max = rule.value.max;

    if (min == null || min === undefined || isNaN(min) || min <= 0) {
      throw new Error(
        `Rule ${ruleIndex + 1}: Please enter a minimum value greater than 0.`,
      );
    }

    if (max == null || max === undefined || isNaN(max) || max <= 0) {
      throw new Error(
        `Rule ${ruleIndex + 1}: Please enter a maximum value (limit) greater than 0.`,
      );
    }

    // Ensure max is greater than min
    if (max <= min) {
      throw new Error(
        `Rule ${ruleIndex + 1}: Maximum value must be greater than minimum value.`,
      );
    }
  },
} as const;

// Add business rules for each attribute
// Keeping this empty for now
export const GROUP_MOVE_ATTRIBUTE_VALIDATORS: Record<
  GroupMoveAttribute,
  GroupMoveAttributeValidator
> = {
  // Operator validators already cover performance value shape/constraints.
  totalLeads: () => {},
  totalConversions: () => {},
  totalSaleAmount: () => {},
  totalCommissions: () => {},
};

export type GroupMoveCondition = z.infer<typeof groupMoveConditionSchema>;

export type GroupMoveRules = z.infer<typeof groupMoveRulesSchema>;

export type GroupMoveAttribute = (typeof GROUP_MOVE_ATTRIBUTES)[number];

type GroupMoveOperator = (typeof GROUP_MOVE_OPERATORS)[number];

export type GroupMoveAttributeConfig = {
  label: string;
  inputType: "number" | "currency";
  operators: readonly GroupMoveOperator[];
};

type GroupMoveAttributeValidatorArgs = {
  rule: GroupMoveCondition;
  ruleIndex: number;
  destinationGroupId: string;
};

type GroupMoveAttributeValidator = (
  params: GroupMoveAttributeValidatorArgs,
) => void;
