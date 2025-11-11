import { FraudRuleType } from "@dub/prisma/client";
import type { FraudRuleEvaluator } from "../types";
import { checkCustomerIPSuspicious } from "./customer-ip-suspicious";
import { checkSelfReferral } from "./self-referral";

export const fraudRuleRegistry: Record<
  FraudRuleType,
  FraudRuleEvaluator | null
> = {
  customer_ip_suspicious: checkCustomerIPSuspicious,
  self_referral: checkSelfReferral,

  // (to be implemented)
  customer_email_suspicious_domain: null,
  customer_ip_country_mismatch: null,
  banned_referral_domain: null,
  suspicious_activity_spike: null,
  paid_ad_traffic_detected: null,
  abnormally_fast_conversion: null,
} as Record<FraudRuleType, FraudRuleEvaluator | null>;
