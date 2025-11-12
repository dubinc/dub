import { checkBannedReferralDomain } from "./rules/check-banned-referral-domain";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidAdTrafficDetected } from "./rules/check-paid-ad-traffic-detected";
import { checkSelfReferralRule } from "./rules/check-self-referral";

export const fraudRuleRegistry = {
  self_referral: checkSelfReferralRule,
  banned_referral_domain: checkBannedReferralDomain,
  paid_ad_traffic_detected: checkPaidAdTrafficDetected,
  customer_email_suspicious_domain: checkCustomerEmailSuspicious,
} as const;
