/**
 * Private to lib/api/workflows.
 * Do not import from UI or other packages — use AWARD_BOUNTY_* /
 * GROUP_MOVE_* / SEND_CAMPAIGN_* from the workflow schema instead.
 */

export const WORKFLOW_ATTRIBUTES = {
  totalLeads: {
    name: "totalLeads",
    label: "total leads",
    inputType: "number",
    operators: ["gte"],
  },
  totalConversions: {
    name: "totalConversions",
    label: "total conversions",
    inputType: "number",
    operators: ["gte"],
  },
  totalSaleAmount: {
    name: "totalSaleAmount",
    label: "total revenue",
    inputType: "currency",
    operators: ["gte"],
  },
  totalCommissions: {
    name: "totalCommissions",
    label: "total commissions",
    inputType: "currency",
    operators: ["gte"],
  },
  partnerEnrolledDays: {
    name: "partnerEnrolledDays",
    label: "enrollment duration",
    inputType: "dropdown",
    operators: ["gte"],
    dropdownValues: [1, 3, 7, 14, 30],
  },
  partnerJoined: {
    name: "partnerJoined",
    label: "joins the program",
    inputType: "none",
    operators: ["gte"],
  },
} as const;

export const WORKFLOW_ATTRIBUTE_KEYS = Object.keys(
  WORKFLOW_ATTRIBUTES,
) as readonly (keyof typeof WORKFLOW_ATTRIBUTES)[];

export type WorkflowAttributeKey = (typeof WORKFLOW_ATTRIBUTE_KEYS)[number];
