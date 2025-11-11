import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkCustomerIPSuspicious } from "./rules/check-customer-ip-suspicious";
import { checkSelfReferralRule } from "./rules/check-self-referral";

export const fraudRuleRegistry = {
  self_referral: checkSelfReferralRule,
  customer_ip_suspicious: checkCustomerIPSuspicious,
  customer_email_suspicious_domain: checkCustomerEmailSuspicious,

  // (to be implemented)
  customer_ip_country_mismatch: null,
  banned_referral_domain: null,
  suspicious_activity_spike: null,
  paid_ad_traffic_detected: null,
  abnormally_fast_conversion: null,
} as const;
