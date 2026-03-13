import { FraudRuleProps } from "@/lib/types";
import { FraudRule, FraudRuleType } from "@dub/prisma/client";
import { CONFIGURABLE_FRAUD_RULES } from "./constants";

// Merges global fraud rules with program-specific overrides.
// Returns an array of merged rules with the program override taking precedence when it exists.
export function getMergedFraudRules(programRules: FraudRule[]) {
  const mergedRules: FraudRuleProps[] = [];

  CONFIGURABLE_FRAUD_RULES.forEach((globalRule) => {
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

export function isFraudRuleEnabled({
  programRules,
  ruleType,
}: {
  programRules: FraudRule[];
  ruleType: FraudRuleType;
}): boolean {
  const mergedRules = getMergedFraudRules(programRules);
  const fraudRule = mergedRules.find((r) => r.type === ruleType);

  return fraudRule ? fraudRule.enabled : true;
}
