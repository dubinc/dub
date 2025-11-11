import { FraudRiskLevel, FraudRule } from "@dub/prisma/client";

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
    ruleType: "customer_ip_suspicious",
    riskLevel: "high",
    name: "Customer IP Associated with Suspicious Activity",
    config: {},
  },
  {
    ruleType: "self_referral",
    riskLevel: "high",
    name: "Self-Referral Detected (Email or IP Match)",
    config: {},
  },
  {
    ruleType: "customer_email_suspicious_domain",
    riskLevel: "medium",
    name: "Customer Email from Disposable Domain",
    config: {},
  },
];
