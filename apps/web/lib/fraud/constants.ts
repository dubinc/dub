import { FraudRiskLevel, FraudRule } from "@dub/prisma/client";
import { checkBannedReferralDomain } from "./rules/check-banned-referral-domain";
import { checkCustomerEmailSuspicious } from "./rules/check-customer-email-suspicious";
import { checkPaidAdTrafficDetected } from "./rules/check-paid-ad-traffic-detected";
import { checkSelfReferralRule } from "./rules/check-self-referral";

// Risk level weights for calculating risk score
export const RISK_LEVEL_WEIGHTS: Record<FraudRiskLevel, number> = {
  high: 10,
  medium: 5,
  low: 1,
};

// Risk level order for determining overall risk level
export const RISK_LEVEL_ORDER: Record<FraudRiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const DEFAULT_FRAUD_RULES: Pick<
  FraudRule,
  "ruleType" | "riskLevel" | "name" | "config"
>[] = [
  {
    ruleType: "self_referral",
    riskLevel: "high",
    name: "Self-Referral Detected (Email or IP Match)",
    config: checkSelfReferralRule.defaultConfig,
  },
  {
    ruleType: "customer_email_suspicious_domain",
    riskLevel: "medium",
    name: "Customer Email from Disposable Domain",
    config: checkCustomerEmailSuspicious.defaultConfig,
  },
  {
    ruleType: "paid_ad_traffic_detected",
    riskLevel: "medium",
    name: "Paid Ad Traffic Detected",
    config: checkPaidAdTrafficDetected.defaultConfig,
  },
  {
    ruleType: "banned_referral_domain",
    riskLevel: "high",
    name: "Banned Referral Domain",
    config: checkBannedReferralDomain.defaultConfig,
  },
];
