import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { fraudRuleSchema } from "../zod/schemas/fraud";

export interface FraudRuleEvaluationResult {
  triggered: boolean;
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

export interface FraudRuleInfo {
  type: FraudRuleType;
  name: string;
  description: string;
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

export type FraudRuleProps = z.infer<typeof fraudRuleSchema>;
