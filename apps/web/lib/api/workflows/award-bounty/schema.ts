import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
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
