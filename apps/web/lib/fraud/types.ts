import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";

export interface FraudRuleEvaluationResult {
  triggered: boolean;
  reason?: FraudReason;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleContext {
  [key: string]: unknown;
}

export interface FraudTriggeredRule {
  ruleType: FraudRuleType;
  riskLevel: FraudRiskLevel;
  reason?: FraudReason;
  metadata?: Record<string, unknown>;
}

// Reason codes for fraud rule triggers
export type FraudReason =
  | "selfReferralEmailMatch"
  | "selfReferralNameMatch"
  | "selfReferralEmailExactMatch"
  | "selfReferralEmailDomainVariation"
  | "selfReferralEmailLevenshtein"
  | "selfReferralNameExactMatch"
  | "selfReferralNameLevenshtein"
  | "customerEmailDisposableDomain"
  | "paidAdTrafficDetected"
  | "bannedReferralDomain";
