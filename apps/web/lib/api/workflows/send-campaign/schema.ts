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
