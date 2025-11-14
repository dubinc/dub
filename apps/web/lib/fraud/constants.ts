import { FraudRuleInfo } from "./types";

export const FRAUD_RULES: FraudRuleInfo[] = [
  {
    type: "customerEmailMatch",
    name: "Matching customer email",
    description:
      "Partner's email matches a customer's email and could be a self referral.",
  },
  {
    type: "customerEmailSimilar",
    name: "Similar customer email",
    description:
      "Partner's email closely resembles a customer email and could be a self referral.",
  },
  {
    type: "referralSourceBanned",
    name: "Banned referral source",
    description:
      "A conversion, event, or click was made on a banned referral domain.",
  },
  {
    type: "paidTrafficDetected",
    name: "Paid traffic",
    description:
      "A conversion, event, or click was made from paid advertising traffic.",
  },
  {
    type: "programBanned",
    name: "Program ban",
    description: "This partner has been banned from other Dub programs.",
  },
] as const;

export const FRAUD_EVENT_STATUS_BADGES = {
  pending: {
    label: "Pending",
    variant: "pending",
  },
  safe: {
    label: "Safe",
    variant: "success",
  },
  banned: {
    label: "Banned",
    variant: "error",
  },
} as const;
