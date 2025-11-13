import { FraudRule, FraudRuleType } from "@dub/prisma/client";
import { FRAUD_RULES } from "./constants";
import { FraudRuleProps } from "./types";

// Merges global fraud rules with program-specific overrides.
// Returns an array of merged rules with the program override taking precedence when it exists.
export function getMergedFraudRules(
  programRules: FraudRule[],
): FraudRuleProps[] {
  const mergedRules: FraudRuleProps[] = [];

  FRAUD_RULES.forEach((globalRule) => {
    const programRule = programRules.find((pr) => pr.type === globalRule.type);

    // Program override exists - use it
    if (programRule) {
      mergedRules.push({
        id: programRule.id,
        type: globalRule.type as FraudRuleType,
        riskLevel: globalRule.riskLevel,
        config: programRule.config ?? undefined,
        enabled: programRule.disabledAt === null,
        name: globalRule.name,
        description: globalRule.description,
      });
      return;
    }

    // No override - use global default
    mergedRules.push({
      id: undefined,
      type: globalRule.type as FraudRuleType,
      riskLevel: globalRule.riskLevel,
      config: undefined,
      enabled: true,
      name: globalRule.name,
      description: globalRule.description,
    });
  });

  return mergedRules;
}
