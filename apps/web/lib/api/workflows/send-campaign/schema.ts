import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import * as z from "zod/v4";
import { WORKFLOW_ATTRIBUTES } from "../attribute-definitions";

export const SEND_CAMPAIGN_ATTRIBUTES = {
  totalLeads: WORKFLOW_ATTRIBUTES.totalLeads,
  totalConversions: WORKFLOW_ATTRIBUTES.totalConversions,
  totalSaleAmount: WORKFLOW_ATTRIBUTES.totalSaleAmount,
  totalCommissions: WORKFLOW_ATTRIBUTES.totalCommissions,
  partnerEnrolledDays: WORKFLOW_ATTRIBUTES.partnerEnrolledDays,
  partnerJoined: WORKFLOW_ATTRIBUTES.partnerJoined,
};

export const SEND_CAMPAIGN_ATTRIBUTE_KEYS = Object.keys(
  SEND_CAMPAIGN_ATTRIBUTES,
) as readonly (keyof typeof SEND_CAMPAIGN_ATTRIBUTES)[];

const SEND_CAMPAIGN_OPERATORS = {
  gte: WORKFLOW_OPERATORS.gte,
};

const SEND_CAMPAIGN_OPERATOR_KEYS = Object.keys(
  SEND_CAMPAIGN_OPERATORS,
) as readonly (keyof typeof SEND_CAMPAIGN_OPERATORS)[];

export const sendCampaignConditionSchema = z.object({
  attribute: z.enum(SEND_CAMPAIGN_ATTRIBUTE_KEYS),
  operator: z.enum(SEND_CAMPAIGN_OPERATOR_KEYS).default("gte"),
  value: z.number(),
});
