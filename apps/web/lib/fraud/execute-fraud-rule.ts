import { FraudRuleType } from "@dub/prisma/client";
import { fraudRulesRegistry } from "./fraud-rules-registry";
import { FraudTriggeredRule } from "./types";

// Execute a fraud rule with the given context and configuration
export async function executeFraudRule<T extends FraudRuleType>(
  type: T,
  context: unknown,
  config?: unknown,
): Promise<FraudTriggeredRule> {
  const rule = fraudRulesRegistry[type];

  if (!rule) {
    throw new Error(`Unknown fraud rule: ${type}`);
  }

  const parsedContext = rule.contextSchema.parse(context);
  const parsedConfig = rule.configSchema?.parse(config);

  // Type assertion is safe because Zod validates types at runtime
  // TypeScript can't narrow the union type, but we know the types match after Zod validation
  return await rule.evaluate(parsedContext as any, parsedConfig as any);
}
