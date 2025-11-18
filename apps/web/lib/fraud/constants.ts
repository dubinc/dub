import { FraudRuleInfo } from "./types";

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
    riskLevel: "high",
  },
  {
    type: "partnerEmailSuspiciousDomain",
    name: "Suspicious email domain",
    description:
      "Uses uncommon or newly registered email domains (e.g., .xyz, .online). Verify legitimacy.",
    scope: "partner",
    riskLevel: "medium",
  },
  {
    type: "partnerEmailDomainMismatch",
    name: "Email domain mismatch with website",
    description: "The custom email domain doesn't match the website provided.",
    scope: "partner",
    riskLevel: "low",
  },
  {
    type: "partnerEmailMasked",
    name: "Masked email address",
    description:
      "Uses an anonymized email address. Not harmful but harder to verify or contact directly.",
    scope: "partner",
    riskLevel: "low",
  },
  {
    type: "partnerDuplicatePayoutMethod",
    name: "Duplicate payout method",
    description:
      "This partner is using a payout method that is already associated with another partner, which may indicate duplicate or fraudulent accounts.",
    scope: "partner",
    riskLevel: "high",
    crossProgram: true,
  },
  {
    type: "partnerNoSocialLinks",
    name: "No website or social links added",
    description:
      "This partner hasn't provided any social or web presence, making verification harder.",
    scope: "partner",
    riskLevel: "medium",
  },
  {
    type: "partnerNoVerifiedSocialLinks",
    name: "No verified website or social links",
    description:
      "Partner hasn't verified their website any social presence, making verification harder.",
    scope: "partner",
    riskLevel: "low",
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
