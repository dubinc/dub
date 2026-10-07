import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import * as z from "zod/v4";
import { WORKFLOW_ATTRIBUTES } from "../attribute-definitions";

export const AWARD_BOUNTY_ATTRIBUTES = {
  totalLeads: WORKFLOW_ATTRIBUTES.totalLeads,
  totalConversions: WORKFLOW_ATTRIBUTES.totalConversions,
  totalSaleAmount: WORKFLOW_ATTRIBUTES.totalSaleAmount,
  totalCommissions: WORKFLOW_ATTRIBUTES.totalCommissions,
};

export const AWARD_BOUNTY_ATTRIBUTE_KEYS = Object.keys(
  AWARD_BOUNTY_ATTRIBUTES,
) as readonly (keyof typeof AWARD_BOUNTY_ATTRIBUTES)[];

export const AWARD_BOUNTY_OPERATORS = {
  gte: WORKFLOW_OPERATORS.gte,
};

const AWARD_BOUNTY_OPERATOR_KEYS = Object.keys(
  AWARD_BOUNTY_OPERATORS,
) as readonly (keyof typeof AWARD_BOUNTY_OPERATORS)[];

export const awardBountyConditionSchema = z.object({
  attribute: z.enum(AWARD_BOUNTY_ATTRIBUTE_KEYS),
  operator: z.enum(AWARD_BOUNTY_OPERATOR_KEYS).default("gte"),
  value: z.number(),
});
