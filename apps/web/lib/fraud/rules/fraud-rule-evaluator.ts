import { FraudRuleType } from "@dub/prisma/client";
import type { FraudRuleEvaluator } from "../types";
import { checkCustomerIPSuspicious } from "./customer-ip-suspicious";
import { checkPartnerEmailMatchesCustomerEmail } from "./partner-email-matches-customer-email";

// Map of rule types to their evaluator functions
export const fraudRuleEvaluators: Record<
  FraudRuleType,
  FraudRuleEvaluator | null
> = {
  customer_ip_suspicious: checkCustomerIPSuspicious,
  partner_email_matches_customer_email: checkPartnerEmailMatchesCustomerEmail,

  // (to be implemented)
  customer_email_suspicious_domain: null,
  customer_ip_country_mismatch: null,
  banned_referral_domain: null,
  suspicious_activity_spike: null,
  paid_ad_traffic_detected: null,
  abnormally_fast_conversion: null,
};
