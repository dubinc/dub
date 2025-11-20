import { PaidTrafficPlatform } from "@/lib/types";
import { FraudRuleInfo, FraudSeverity } from "./types";

export const FRAUD_RULES: FraudRuleInfo[] = [
  {
    type: "customerEmailMatch",
    name: "Matching customer email",
    description:
      "Partner's email matches a customer's email and could be a self referral.",
    scope: "conversionEvent",
    configurable: false,
  },
  {
    type: "customerEmailSuspiciousDomain",
    name: "Suspicious customer email domain",
    description:
      "Customer's email uses a disposable or temporary domain which could be a fraud attempt.",
    scope: "conversionEvent",
    configurable: false,
  },
  {
    type: "referralSourceBanned",
    name: "Banned referral source",
    description:
      "A conversion, event, or click was made on a banned referral domain.",
    scope: "conversionEvent",
    configurable: true,
  },
  {
    type: "paidTrafficDetected",
    name: "Paid traffic",
    description:
      "A conversion, event, or click was made from paid advertising traffic.",
    scope: "conversionEvent",
    configurable: true,
  },
  {
    type: "partnerCrossProgramBan",
    name: "Program ban",
    description: "This partner has been banned from other Dub programs.",
    scope: "partner",
    severity: "high",
    crossProgram: true,
    configurable: false,
  },
  {
    type: "partnerDuplicatePayoutMethod",
    name: "Duplicate payout method",
    description:
      "This partner is using a payout method that is already associated with another partner, which may indicate duplicate or fraudulent accounts.",
    scope: "partner",
    severity: "high",
    crossProgram: true,
    configurable: false,
  },
  {
    type: "partnerEmailDomainMismatch",
    name: "Email domain mismatch with website",
    description: "The custom email domain doesn't match the website provided.",
    scope: "partner",
    severity: "low",
    configurable: false,
  },
  {
    type: "partnerEmailMasked",
    name: "Masked email address",
    description:
      "Uses an anonymized email address. Not harmful but harder to verify or contact directly.",
    scope: "partner",
    severity: "low",
    configurable: false,
  },
  {
    type: "partnerNoSocialLinks",
    name: "No website or social links added",
    description:
      "This partner hasn't provided any social or web presence, making verification harder.",
    scope: "partner",
    severity: "medium",
    configurable: false,
  },
  {
    type: "partnerNoVerifiedSocialLinks",
    name: "No verified website or social links",
    description:
      "Partner hasn't verified their website any social presence, making verification harder.",
    scope: "partner",
    severity: "low",
    configurable: false,
  },
] as const;

export const FRAUD_RULES_BY_TYPE = Object.fromEntries(
  FRAUD_RULES.map((rule) => [rule.type, rule]),
) as Record<FraudRuleInfo["type"], FraudRuleInfo>;

export const FRAUD_RULES_BY_SCOPE = FRAUD_RULES.reduce(
  (acc, rule) => {
    (acc[rule.scope] ||= []).push(rule);
    return acc;
  },
  {} as Record<FraudRuleInfo["scope"], FraudRuleInfo[]>,
);

export const CONFIGURABLE_FRAUD_RULES = FRAUD_RULES.filter(
  (rule) => rule.configurable,
)

export const FRAUD_SEVERITY_CONFIG: Record<
  FraudSeverity,
  {
    bg: string;
    fg: string;
    label: string;
    rank: number;
  }
> = {
  low: {
    bg: "bg-neutral-400",
    fg: "text-neutral-400",
    label: "Low",
    rank: 0,
  },
  medium: {
    bg: "bg-orange-500",
    fg: "text-orange-500",
    label: "Medium",
    rank: 1,
  },
  high: {
    bg: "bg-red-600",
    fg: "text-red-600",
    label: "High",
    rank: 2,
  },
} as const;

export const PAID_TRAFFIC_PLATFORMS = [
  "google",
  "facebook",
  "x",
  "bing",
  "linkedin",
  "reddit",
  "tiktok",
] as const;

export const PAID_TRAFFIC_PLATFORMS_CONFIG: {
  id: PaidTrafficPlatform;
  name: string;
  queryParams: string[];
}[] = [
  {
    id: "google",
    name: "Google",
    queryParams: ["gclid", "gclsrc", "gbraid", "wbraid"],
  },
  {
    id: "facebook",
    name: "Facebook",
    queryParams: ["fbclid", "fb_action_ids"],
  },
  {
    id: "x",
    name: "X",
    queryParams: ["twclid"],
  },
  {
    id: "bing",
    name: "Bing",
    queryParams: ["msclkid"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    queryParams: ["li_fat_id"],
  },
  {
    id: "reddit",
    name: "Reddit",
    queryParams: ["rdclid"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    queryParams: ["ttclid"],
  },
] as const;
