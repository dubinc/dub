import { FraudRuleType } from "@dub/prisma/client";
import { fraudRuleRegistry } from "./fraud-rules-registry";
import type { FraudRuleEvaluationResult } from "./types";

export async function executeFraudRule<T extends FraudRuleType>(
  ruleType: T,
  context: unknown,
  config?: unknown,
): Promise<FraudRuleEvaluationResult> {
  const rule = fraudRuleRegistry[ruleType];

  if (!rule) {
    throw new Error(`Unknown fraud rule: ${ruleType}`);
  }

  const parsedContext = rule.contextSchema.parse(context);
  const parsedConfig = rule.configSchema.parse(config);

  // Type assertion is safe because Zod validates types at runtime
  // TypeScript can't narrow the union type, but we know the types match after Zod validation
  return await rule.evaluate(parsedContext as any, parsedConfig as any);
}
