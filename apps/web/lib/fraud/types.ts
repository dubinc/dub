import type { FraudReasonCode } from "./reason-codes";

export interface FraudRuleEvaluationResult {
  triggered: boolean;
  reasonCode?: FraudReasonCode;
  metadata?: Record<string, unknown>;
}

export interface FraudRuleContext {
  [key: string]: unknown;
}

export interface FraudRuleEvaluator {
  (
    context: FraudRuleContext,
    config: unknown,
  ): Promise<FraudRuleEvaluationResult>;
}

export interface FraudRuleEvaluators {
  [key: string]: FraudRuleEvaluator;
}
