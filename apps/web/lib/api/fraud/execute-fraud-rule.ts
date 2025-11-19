import { FraudRuleType } from "@dub/prisma/client";
import { fraudRulesRegistry } from "./fraud-rules-registry";
import { FraudTriggeredRule } from "./types";

// Execute a fraud rule with the given context and configuration
export async function executeFraudRule<T extends FraudRuleType>({
  type,
  context,
  config,
}: {
  type: T;
  context: unknown;
  config?: unknown;
}): Promise<FraudTriggeredRule> {
  const rule = fraudRulesRegistry[type];

  if (!rule) {
    throw new Error(`Unknown fraud rule: ${type}`);
  }

  return await rule.evaluate(context, config);
}
