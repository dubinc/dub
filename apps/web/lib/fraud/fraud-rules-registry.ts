import { FraudRuleType } from "@dub/prisma/client";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkCustomerIPSuspicious } from "./rules/check-customer-ip-suspicious";
import { checkSelfReferral } from "./rules/check-self-referral";
import type { FraudRuleEvaluator } from "./types";

export const fraudRuleRegistry: Record<
  FraudRuleType,
  FraudRuleEvaluator | null
> = {
  customer_ip_suspicious: checkCustomerIPSuspicious,
  self_referral: checkSelfReferral,
  customer_email_suspicious_domain: checkCustomerEmailSuspicious,

  // (to be implemented)
  customer_ip_country_mismatch: null,
  banned_referral_domain: null,
  suspicious_activity_spike: null,
  paid_ad_traffic_detected: null,
  abnormally_fast_conversion: null,
} as Record<FraudRuleType, FraudRuleEvaluator | null>;
