import { FraudRule } from "@dub/prisma/client";

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
];
