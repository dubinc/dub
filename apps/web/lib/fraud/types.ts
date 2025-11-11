export interface FraudRuleEvaluationResult {
  triggered: boolean;
  reason?: string;
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
