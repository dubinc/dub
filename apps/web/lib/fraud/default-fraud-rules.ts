import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";

interface FraudRule {
  name: string;
  ruleType: FraudRuleType;
  riskLevel: FraudRiskLevel;
  enabled: boolean;
  config: Record<string, any>;
}

export const DEFAULT_HIGH_RISK_RULES: FraudRule[] = [
  {
    ruleType: "customer_ip_suspicious",
    riskLevel: "high",
    enabled: true,
    name: "Customer IP Associated with Suspicious Activity",
    config: {},
  },
  {
    ruleType: "self_referral",
    riskLevel: "high",
    enabled: true,
    name: "Self-Referral Detected (Email or IP Match)",
    config: {},
  },
];
