import type { FraudReason } from "./fraud-reasons";

export interface FraudRuleEvaluationResult {
  triggered: boolean;
  reason?: FraudReason;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleContext {
  [key: string]: unknown;
}
