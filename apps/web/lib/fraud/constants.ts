import { ApplicationFraudSeverity, FraudRuleInfo } from "./types";

export const FRAUD_RULES: FraudRuleInfo[] = [
  {
    type: "customerEmailMatch",
    name: "Matching customer email",
    description:
      "Partner's email matches a customer's email and could be a self referral.",
    scope: "conversionEvent",
  },
  {
    type: "customerEmailSuspiciousDomain",
    name: "Suspicious customer email domain",
    description:
      "Customer's email uses a disposable or temporary domain which could be a fraud attempt.",
    scope: "conversionEvent",
  },
  {
    type: "referralSourceBanned",
    name: "Banned referral source",
    description:
      "A conversion, event, or click was made on a banned referral domain.",
    scope: "conversionEvent",
  },
  {
    type: "paidTrafficDetected",
    name: "Paid traffic",
    description:
      "A conversion, event, or click was made from paid advertising traffic.",
    scope: "conversionEvent",
  },
  {
    type: "partnerCrossProgramBan",
    name: "Program ban",
    description: "This partner has been banned from other Dub programs.",
    scope: "partner",
    crossProgram: true,
  },
  {
    type: "partnerDuplicatePayoutMethod",
    name: "Duplicate payout method",
    description:
      "This partner is using a payout method that is already associated with another partner, which may indicate duplicate or fraudulent accounts.",
    scope: "partner",
    crossProgram: true,
  },
] as const;

// type -> fraud rule info
export const FRAUD_RULES_BY_TYPE = Object.fromEntries(
  FRAUD_RULES.map((rule) => [rule.type, rule]),
) as Record<FraudRuleInfo["type"], FraudRuleInfo>;

// scope -> fraud rules[]
export const FRAUD_RULES_BY_SCOPE = FRAUD_RULES.reduce(
  (acc, rule) => {
    (acc[rule.scope] ||= []).push(rule);
    return acc;
  },
  {} as Record<FraudRuleInfo["scope"], FraudRuleInfo[]>,
);

export const APPLICATION_FRAUD_RULES = [
  {
    type: "partnerEmailDomainMismatch",
    name: "Email domain mismatch with website",
    description: "The custom email domain doesn't match the website provided.",
    severity: "low",
  },
  {
    type: "partnerEmailMasked",
    name: "Masked email address",
    description:
      "Uses an anonymized email address. Not harmful but harder to verify or contact directly.",
    severity: "low",
  },
  {
    type: "partnerNoSocialLinks",
    name: "No website or social links added",
    description:
      "This partner hasn't provided any social or web presence, making verification harder.",
    severity: "medium",
  },
  {
    type: "partnerNoVerifiedSocialLinks",
    name: "No verified website or social links",
    description:
      "Partner hasn't verified their website any social presence, making verification harder.",
    severity: "low",
  },
] as const;

export const APPLICATION_FRAUD_SEVERITY_CONFIG: Record<
  ApplicationFraudSeverity,
  { color: string; label: string; rank: number }
> = {
  low: {
    color: "bg-neutral-400",
    label: "Low",
    rank: 0,
  },
  medium: {
    color: "bg-orange-600", // TODO: this should be bg-orange-500
    label: "Medium",
    rank: 1,
  },
  high: {
    color: "bg-red-600",
    label: "High",
    rank: 2,
  },
} as const;
