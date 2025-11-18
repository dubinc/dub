import { FraudRuleInfo } from "./types";

export const FRAUD_RULES: FraudRuleInfo[] = [
  {
    type: "customerEmailMatch",
    name: "Matching customer email",
    description:
      "Partner's email matches a customer's email and could be a self referral.",
  },
  {
    type: "customerEmailSuspiciousDomain",
    name: "Suspicious customer email domain",
    description:
      "Customer's email uses a disposable or temporary domain which could be a fraud attempt.",
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
    type: "partnerCrossProgramBan",
    name: "Program ban",
    description: "This partner has been banned from other Dub programs.",
  },
  {
    type: "partnerEmailSuspiciousDomain",
    name: "Suspicious email domain",
    description:
      "Uses uncommon or newly registered email domains (e.g., .xyz, .online). Verify legitimacy.",
  },
  {
    type: "partnerEmailDomainMismatch",
    name: "Email domain mismatch with website",
    description: "The custom email domain doesn't match the website provided.",
  },
  {
    type: "partnerEmailMasked",
    name: "Email address created with Apple's 'Hide My Email'",
    description:
      "Uses an anonymize Apple address. Not harmful but harder to verify or contact directly.",
  },
  {
    type: "partnerDuplicatePayoutMethod",
    name: "Duplicate payout method",
    description:
      "This partner is using a payout method that is already associated with another partner, which may indicate duplicate or fraudulent accounts.",
  },
  {
    type: "partnerNoSocialLinks",
    name: "No website or social links added",
    description:
      "This applicant hasn't provided any social or web presence, making verification harder.",
  },
  {
    type: "partnerNoVerifiedSocialLinks",
    name: "No verified website or social links",
    description:
      "Applicant hasn't verified their website any social presence, making verification harder.",
  },
] as const;

// Map of fraud rule type to fraud rule info
export const FRAUD_RULE_MAP = Object.fromEntries(
  FRAUD_RULES.map((rule) => [rule.type, rule]),
) as Record<FraudRuleInfo["type"], FraudRuleInfo>;
