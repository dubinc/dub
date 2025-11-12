import type { FraudReasonCode } from "./fraud-reason-codes";

export interface FraudRuleEvaluationResult {
  triggered: boolean;
  reasonCode?: FraudReasonCode;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleContext {
  [key: string]: unknown;
}
