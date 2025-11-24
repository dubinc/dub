import { FraudRuleProps } from "@/lib/types";
import { FraudRule, FraudRuleType } from "@dub/prisma/client";
import { FRAUD_RULES_BY_SCOPE } from "./constants";

// Merges global fraud rules with program-specific overrides.
// Returns an array of merged rules with the program override taking precedence when it exists.
export function getMergedFraudRules(programRules: FraudRule[]) {
  const mergedRules: FraudRuleProps[] = [];

  FRAUD_RULES_BY_SCOPE["conversionEvent"].forEach((globalRule) => {
    const programRule = programRules.find(
      (programRule) => programRule.type === globalRule.type,
    );

    // Program override exists - use it
    if (programRule) {
      mergedRules.push({
        id: programRule.id,
        name: globalRule.name,
        description: globalRule.description,
        type: globalRule.type as FraudRuleType,
        config: programRule.config ?? undefined,
        enabled: programRule.disabledAt === null,
      });
      return;
    }

    // No override - use global default
    mergedRules.push({
      id: undefined,
      name: globalRule.name,
      description: globalRule.description,
      type: globalRule.type as FraudRuleType,
      config: undefined,
      enabled: true,
    });
  });

  return mergedRules;
}
