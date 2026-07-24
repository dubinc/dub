import * as z from "zod/v4";

export const AWARD_BOUNTY_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
] as const;

export const AWARD_BOUNTY_OPERATORS = ["gte"] as const;

export const AWARD_BOUNTY_ATTRIBUTE_CONFIG: Record<
  AwardBountyAttribute,
  AwardBountyAttributeConfig
> = {
  totalLeads: {
    label: "total leads",
    inputType: "number",
    operators: ["gte"],
  },
  totalConversions: {
    label: "total conversions",
    inputType: "number",
    operators: ["gte"],
  },
  totalSaleAmount: {
    label: "total revenue",
    inputType: "currency",
    operators: ["gte"],
  },
  totalCommissions: {
    label: "total commissions",
    inputType: "currency",
    operators: ["gte"],
  },
};

export const AWARD_BOUNTY_OPERATOR_LABELS: Record<AwardBountyOperator, string> =
  {
    gte: "at least",
  } as const;

export const awardBountyConditionSchema = z.object({
  attribute: z.enum(AWARD_BOUNTY_ATTRIBUTES),
  operator: z.enum(AWARD_BOUNTY_OPERATORS).default("gte"),
  value: z.number(),
});

export type AwardBountyCondition = z.infer<typeof awardBountyConditionSchema>;

export type AwardBountyAttribute = (typeof AWARD_BOUNTY_ATTRIBUTES)[number];

type AwardBountyOperator = (typeof AWARD_BOUNTY_OPERATORS)[number];

export type AwardBountyAttributeConfig = {
  label: string;
  inputType: "number" | "currency";
  operators: readonly AwardBountyOperator[];
};
