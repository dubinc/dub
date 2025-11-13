// Reason codes for fraud rule triggers
export type FraudReasonCode =
  | "selfReferralEmailMatch"
  | "selfReferralNameMatch"
  | "selfReferralEmailExactMatch"
  | "selfReferralEmailDomainVariation"
  | "selfReferralEmailLevenshtein"
  | "selfReferralNameExactMatch"
  | "selfReferralNameLevenshtein"
  | "customerEmailDisposableDomain"
  | "paidAdTrafficDetected"
  | "bannedReferralDomain"
  | "ruleTriggered";

// Mapping from reason codes to human-readable messages
export const FRAUD_REASON_MESSAGES: Record<FraudReasonCode, string> = {
  selfReferralEmailMatch: "Self-referral detected: email match",
  selfReferralNameMatch: "Self-referral detected: name match",
  selfReferralEmailExactMatch: "Self-referral detected: exact email match",
  selfReferralEmailDomainVariation:
    "Self-referral detected: similar email domain",
  selfReferralEmailLevenshtein:
    "Self-referral detected: similar email address",
  selfReferralNameExactMatch: "Self-referral detected: exact name match",
  selfReferralNameLevenshtein: "Self-referral detected: similar name",
  customerEmailDisposableDomain:
    "Customer email from disposable email domain",
  paidAdTrafficDetected: "Paid ad traffic detected",
  bannedReferralDomain: "Banned referral domain",
  ruleTriggered: "Fraud rule triggered",
};

// Get human-readable message for a reason code
export function getFraudReasonMessage(code: FraudReasonCode): string {
  return FRAUD_REASON_MESSAGES[code] || FRAUD_REASON_MESSAGES.ruleTriggered;
}
