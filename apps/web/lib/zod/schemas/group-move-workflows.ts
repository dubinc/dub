import * as z from "zod/v4";

export const GROUP_MOVE_PERFORMANCE_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
] as const;

export const GROUP_MOVE_ATTRIBUTES = [
  ...GROUP_MOVE_PERFORMANCE_ATTRIBUTES,
  "fromPartnerGroup",
] as const;

export const GROUP_MOVE_OPERATORS = [
  "gte",
  "between",
  "equals_to",
  "not_equals",
  "in",
  "not_in",
] as const;

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
  fromPartnerGroup: {
    label: "group",
    inputType: "group",
    operators: ["equals_to", "not_equals", "in", "not_in"],
  },
};

export const GROUP_MOVE_OPERATOR_LABELS: Record<GroupMoveOperator, string> = {
  gte: "more than",
  between: "between",
  equals_to: "is",
  not_equals: "is not",
  in: "is one of",
  not_in: "is not one of",
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
    z.string(),
    z.array(z.string()),
  ]),
});

export const groupMoveRulesSchema = z.array(groupMoveConditionSchema);

export type GroupMoveCondition = z.infer<typeof groupMoveConditionSchema>;

export type GroupMoveRules = z.infer<typeof groupMoveRulesSchema>;

export type GroupMoveAttribute = (typeof GROUP_MOVE_ATTRIBUTES)[number];

type GroupMoveOperator = (typeof GROUP_MOVE_OPERATORS)[number];

export type GroupMoveAttributeConfig = {
  label: string;
  inputType: "number" | "currency" | "group";
  operators: readonly GroupMoveOperator[];
};
