import * as z from "zod/v4";

export const SEND_CAMPAIGN_ATTRIBUTES = [
  "totalLeads",
  "totalConversions",
  "totalSaleAmount",
  "totalCommissions",
  "partnerEnrolledDays",
  "partnerJoined",
] as const;

export const SEND_CAMPAIGN_OPERATORS = ["gte"] as const;

export const SEND_CAMPAIGN_ATTRIBUTE_CONFIG: Record<
  SendCampaignAttribute,
  SendCampaignAttributeConfig
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
  partnerEnrolledDays: {
    label: "enrollment duration",
    inputType: "dropdown",
    operators: ["gte"],
    dropdownValues: [1, 3, 7, 14, 30],
  },
  partnerJoined: {
    label: "joins the program",
    inputType: "none",
    operators: ["gte"],
  },
};

export const SEND_CAMPAIGN_OPERATOR_LABELS: Record<
  SendCampaignOperator,
  string
> = {
  gte: "at least",
} as const;

export const sendCampaignConditionSchema = z.object({
  attribute: z.enum(SEND_CAMPAIGN_ATTRIBUTES),
  operator: z.enum(SEND_CAMPAIGN_OPERATORS).default("gte"),
  value: z.number(),
});

export type SendCampaignCondition = z.infer<typeof sendCampaignConditionSchema>;

export type SendCampaignAttribute = (typeof SEND_CAMPAIGN_ATTRIBUTES)[number];

type SendCampaignOperator = (typeof SEND_CAMPAIGN_OPERATORS)[number];

export type SendCampaignAttributeConfig = {
  label: string;
  inputType: "number" | "currency" | "dropdown" | "none";
  operators: readonly SendCampaignOperator[];
  dropdownValues?: number[];
};
