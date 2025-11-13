// Reason codes for fraud rule triggers
export type FraudReason =
  | "selfReferralEmailMatch"
  | "selfReferralNameMatch"
  | "selfReferralEmailExactMatch"
  | "selfReferralEmailDomainVariation"
  | "selfReferralEmailLevenshtein"
  | "selfReferralNameExactMatch"
  | "selfReferralNameLevenshtein"
  | "customerEmailDisposableDomain"
  | "paidAdTrafficDetected"
  | "bannedReferralDomain";

// Mapping from reason codes to human-readable messages
export const FRAUD_REASON_MESSAGES: Record<FraudReason, string> = {
  selfReferralEmailMatch: "Self-referral detected: email match",
  selfReferralNameMatch: "Self-referral detected: name match",
  selfReferralEmailExactMatch: "Self-referral detected: exact email match",
  selfReferralEmailDomainVariation:
    "Self-referral detected: similar email domain",
  selfReferralEmailLevenshtein: "Self-referral detected: similar email address",
  selfReferralNameExactMatch: "Self-referral detected: exact name match",
  selfReferralNameLevenshtein: "Self-referral detected: similar name",
  customerEmailDisposableDomain: "Customer email from disposable email domain",
  paidAdTrafficDetected: "Paid ad traffic detected",
  bannedReferralDomain: "Banned referral domain",
};

// Get human-readable message for a reason code
export function getFraudReasonMessage(code: FraudReason): string {
  return FRAUD_REASON_MESSAGES[code] || "Rule triggered";
}
