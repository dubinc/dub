// Reason codes for fraud rule triggers
export type FraudReasonCode =
  // Self-referral reasons
  | "self_referral_email_match"
  | "self_referral_name_match"
  | "self_referral_email_exact_match"
  | "self_referral_email_domain_variation"
  | "self_referral_email_levenshtein"
  | "self_referral_name_exact_match"
  | "self_referral_name_levenshtein"

  // Generic fallback
  | "rule_triggered";

// Mapping from reason codes to human-readable messages
export const FRAUD_REASON_MESSAGES: Record<FraudReasonCode, string> = {
  // Self-referral reasons
  self_referral_email_match: "Self-referral detected: email match",
  self_referral_name_match: "Self-referral detected: name match",
  self_referral_email_exact_match: "Self-referral detected: exact email match",
  self_referral_email_domain_variation:
    "Self-referral detected: similar email domain",
  self_referral_email_levenshtein:
    "Self-referral detected: similar email address",
  self_referral_name_exact_match: "Self-referral detected: exact name match",
  self_referral_name_levenshtein: "Self-referral detected: similar name",

  // Generic fallback
  rule_triggered: "Fraud rule triggered",
};

// Get human-readable message for a reason code
export function getFraudReasonMessage(code: FraudReasonCode): string {
  return FRAUD_REASON_MESSAGES[code] || FRAUD_REASON_MESSAGES.rule_triggered;
}
