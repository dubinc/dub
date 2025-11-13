import { FraudRuleType } from "@dub/prisma/client";
import { defineFraudRule } from "./define-fraud-rule";
import { checkBannedReferralDomain } from "./rules/check-banned-referral-domain";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidAdTrafficDetected } from "./rules/check-paid-ad-traffic-detected";
import { checkSelfReferralRule } from "./rules/check-self-referral";

export const fraudRuleRegistry: Record<
  FraudRuleType,
  ReturnType<typeof defineFraudRule>
> = {
  selfReferral: checkSelfReferralRule,
  bannedReferralDomain: checkBannedReferralDomain,
  paidAdTrafficDetected: checkPaidAdTrafficDetected,
  customerEmailSuspiciousDomain: checkCustomerEmailSuspicious,
};

export function getFraudRules() {
  return Object.entries(fraudRuleRegistry).map(([type, ruleDefinition]) => ({
    type,
    riskLevel: ruleDefinition.riskLevel,
    config: ruleDefinition.defaultConfig,
  }));
}
