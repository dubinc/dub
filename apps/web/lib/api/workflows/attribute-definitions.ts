/**
 * Private to lib/api/workflows.
 * Do not import from UI or other packages — use AWARD_BOUNTY_* /
 * GROUP_MOVE_* / SEND_CAMPAIGN_* from the workflow schema instead.
 * This is the superset of attributes that are used in the workflow schema.
 */

const WORKFLOW_DATA_REQUIREMENTS = ["commissions", "partnerLinkStats"] as const;

export type WorkflowDataRequirement =
  (typeof WORKFLOW_DATA_REQUIREMENTS)[number];

export type WorkflowAttribute = {
  name: string;
  label: string;
  inputType: "number" | "currency" | "dropdown" | "none" | "group";
  operators: readonly string[];
  requires: readonly WorkflowDataRequirement[];
  dropdownValues?: readonly number[];
  exclusive?: boolean;
  scheduled?: boolean;
};

export const WORKFLOW_ATTRIBUTE_KEYS = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
  "partnerEnrolledDays",
  "partnerJoined",
  "partnerGroup",
] as const;

export type WorkflowAttributeKey = (typeof WORKFLOW_ATTRIBUTE_KEYS)[number];

export const WORKFLOW_ATTRIBUTES: Record<
  WorkflowAttributeKey,
  WorkflowAttribute
> = {
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
    scheduled: true,
  },
  partnerJoined: {
    name: "partnerJoined",
    label: "joins the program",
    inputType: "none",
    operators: ["gte"],
    requires: [],
    exclusive: true,
  },
  partnerGroup: {
    name: "partnerGroup",
    label: "group",
    inputType: "group",
    operators: ["eq", "ne", "in", "notIn"],
    requires: [],
  },
};
