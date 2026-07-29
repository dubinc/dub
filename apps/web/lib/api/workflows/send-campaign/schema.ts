import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import * as z from "zod/v4";
import { WORKFLOW_ATTRIBUTES } from "../attribute-definitions";

const SEND_CAMPAIGN_METRIC_ATTRIBUTES = {
  totalLeads: {
    ...WORKFLOW_ATTRIBUTES.totalLeads,
    operators: ["gte", "lte"] as const,
  },
  totalConversions: {
    ...WORKFLOW_ATTRIBUTES.totalConversions,
    operators: ["gte", "lte"] as const,
  },
  totalSaleAmount: {
    ...WORKFLOW_ATTRIBUTES.totalSaleAmount,
    operators: ["gte", "lte"] as const,
  },
  totalCommissions: {
    ...WORKFLOW_ATTRIBUTES.totalCommissions,
    operators: ["gte", "lte"] as const,
  },
} as const;

const SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTES = {
  partnerEnrolledDays: {
    ...WORKFLOW_ATTRIBUTES.partnerEnrolledDays,
    operators: ["gte"] as const,
  },
  partnerJoined: {
    ...WORKFLOW_ATTRIBUTES.partnerJoined,
    operators: ["gte"] as const,
  },
} as const;

export const SEND_CAMPAIGN_ATTRIBUTES = {
  ...SEND_CAMPAIGN_METRIC_ATTRIBUTES,
  ...SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTES,
};

export const SEND_CAMPAIGN_ATTRIBUTE_KEYS = Object.keys(
  SEND_CAMPAIGN_ATTRIBUTES,
) as readonly (keyof typeof SEND_CAMPAIGN_ATTRIBUTES)[];

export type SendCampaignAttributeKey =
  (typeof SEND_CAMPAIGN_ATTRIBUTE_KEYS)[number];

export const SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTE_KEYS = Object.keys(
  SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTES,
) as readonly (keyof typeof SEND_CAMPAIGN_ENROLLMENT_ATTRIBUTES)[];

export const SEND_CAMPAIGN_OPERATORS = {
  gte: WORKFLOW_OPERATORS.gte,
  lte: WORKFLOW_OPERATORS.lte,
};

export const SEND_CAMPAIGN_OPERATOR_KEYS = Object.keys(
  SEND_CAMPAIGN_OPERATORS,
) as readonly (keyof typeof SEND_CAMPAIGN_OPERATORS)[];

export const sendCampaignConditionSchema = z.object({
  attribute: z.enum(SEND_CAMPAIGN_ATTRIBUTE_KEYS),
  operator: z.enum(SEND_CAMPAIGN_OPERATOR_KEYS).default("gte"),
  value: z.number(),
});

export const sendCampaignConditionsSchema = z.array(
  sendCampaignConditionSchema,
);
