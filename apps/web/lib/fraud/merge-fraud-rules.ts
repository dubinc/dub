import { FraudRiskLevel, FraudRule, FraudRuleType } from "@dub/prisma/client";
import { getFraudRules } from "./fraud-rules-registry";

export interface MergedFraudRule {
  id: string | undefined;
  type: FraudRuleType;
  riskLevel: FraudRiskLevel;
  config: unknown;
  enabled: boolean;
}

// Merges global fraud rules with program-specific overrides.
// Returns an array of merged rules with the program override taking precedence when it exists.
export function mergeFraudRulesWithProgramOverrides(
  programRules: FraudRule[],
): MergedFraudRule[] {
  const globalRules = getFraudRules();

  return globalRules.map((globalRule) => {
    const programRule = programRules.find((pr) => pr.type === globalRule.type);

    // Program override exists - use it
    if (programRule) {
      return {
        id: programRule.id,
        type: globalRule.type as FraudRuleType,
        riskLevel: globalRule.riskLevel,
        config: programRule.config ?? globalRule.config,
        enabled: programRule.disabledAt === null,
      };
    }

    // No override - use global default
    return {
      id: undefined,
      type: globalRule.type as FraudRuleType,
      riskLevel: globalRule.riskLevel,
      config: globalRule.config,
      enabled: true,
    };
  });
}
