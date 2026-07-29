/**
 * Private to lib/api/workflows.
 * Do not import from UI or other packages — use AWARD_BOUNTY_* /
 * GROUP_MOVE_* / SEND_CAMPAIGN_* from the workflow schema instead.
 */

const WORKFLOW_DATA_REQUIREMENTS = ["commissions", "partnerLinkStats"] as const;

export const WORKFLOW_ATTRIBUTES = {
  totalLeads: {
    name: "totalLeads",
    label: "total leads",
    inputType: "number",
    operators: ["gte"],
    requires: ["partnerLinkStats"],
  },
  totalConversions: {
    name: "totalConversions",
    label: "total conversions",
    inputType: "number",
    operators: ["gte"],
    requires: ["partnerLinkStats"],
  },
  totalSaleAmount: {
    name: "totalSaleAmount",
    label: "total revenue",
    inputType: "currency",
    operators: ["gte"],
    requires: ["partnerLinkStats"],
  },
  totalCommissions: {
    name: "totalCommissions",
    label: "total commissions",
    inputType: "currency",
    operators: ["gte"],
    requires: ["commissions"],
  },
  partnerEnrolledDays: {
    name: "partnerEnrolledDays",
    label: "enrollment duration",
    inputType: "dropdown",
    operators: ["gte"],
    dropdownValues: [1, 3, 7, 14, 30],
    requires: [],
  },
  partnerJoined: {
    name: "partnerJoined",
    label: "joins the program",
    inputType: "none",
    operators: ["gte"],
    requires: [],
  },
  partnerGroup: {
    name: "partnerGroup",
    label: "group",
    inputType: "group",
    operators: ["eq", "ne", "in", "notIn"],
    requires: [],
  },
} as const;

export const WORKFLOW_ATTRIBUTE_KEYS = Object.keys(
  WORKFLOW_ATTRIBUTES,
) as readonly (keyof typeof WORKFLOW_ATTRIBUTES)[];

export type WorkflowAttributeKey = (typeof WORKFLOW_ATTRIBUTE_KEYS)[number];

export type WorkflowDataRequirement =
  (typeof WORKFLOW_DATA_REQUIREMENTS)[number];
