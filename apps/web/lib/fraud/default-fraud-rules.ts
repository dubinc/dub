import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import {
  customerIPSuspiciousConfigSchema,
  partnerEmailMatchesCustomerEmailConfigSchema,
} from "./rules/schemas";

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
    config: customerIPSuspiciousConfigSchema.parse({}),
  },
  {
    ruleType: "partner_email_matches_customer_email",
    riskLevel: "high",
    enabled: true,
    name: "Partner Email Matches or Similar to Customer Email",
    config: partnerEmailMatchesCustomerEmailConfigSchema.parse({}),
  },
];
