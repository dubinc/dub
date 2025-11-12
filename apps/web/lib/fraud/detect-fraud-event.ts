import { prisma } from "@dub/prisma";
import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { RISK_LEVEL_ORDER, RISK_LEVEL_WEIGHTS } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";
import type { FraudReasonCode } from "./fraud-reason-codes";
import { getFraudRules } from "./fraud-rules-registry";

interface TriggeredRule {
  ruleId?: string;
  ruleType: FraudRuleType;
  riskLevel: FraudRiskLevel;
  reasonCode?: FraudReasonCode;
  metadata?: Record<string, unknown>;
}

interface FraudEvaluationResult {
  riskLevel: FraudRiskLevel | null;
  riskScore: number;
  triggeredRules: TriggeredRule[];
}

interface DetectFraudEventProps {
  programId: string;
  partner: {
    id: string;
    email: string | null;
    name: string | null;
  };
  customer: {
    id: string;
    email: string | null;
    name: string | null;
  };
  click: {
    url: string | null;
    referer: string | null;
  };
}

// Evaluate fraud risk for a conversion event
// Executes all enabled rules and calculates risk score
export async function detectFraudEvent(
  context: DetectFraudEventProps,
): Promise<FraudEvaluationResult> {
  console.log("context", context);

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: context.programId,
    },
  });

  // Merge global rules with program overrides
  const activeRules = getFraudRules().map((defaultRule) => {
    const override = programRules.find(
      (o) => o.ruleType === defaultRule.ruleType,
    );

    // Program override exists - use it
    if (override) {
      return {
        id: override.id,
        ruleType: override.ruleType,
        riskLevel: override.riskLevel,
        name: override.name,
        config: override.config ?? defaultRule.config,
      };
    }

    // No override - use global default
    return {
      id: undefined,
      ruleType: defaultRule.ruleType,
      riskLevel: defaultRule.riskLevel,
      name: defaultRule.name,
      config: defaultRule.config,
    };
  });

  let riskScore = 0;
  let highestRiskLevel: FraudRiskLevel | null = null;
  const triggeredRules: TriggeredRule[] = [];

  // Evaluate each rule
  for (const rule of activeRules) {
    try {
      // Evaluate rule
      const result = await executeFraudRule(
        rule.ruleType,
        context,
        rule.config,
      );

      // Rule triggered
      if (result.triggered) {
        triggeredRules.push({
          ruleId: rule.id,
          ruleType: rule.ruleType,
          riskLevel: rule.riskLevel,
          reasonCode: result.reasonCode,
          metadata: result.metadata,
        });

        // Add to risk score
        const ruleWeight = RISK_LEVEL_WEIGHTS[rule.riskLevel];
        riskScore += ruleWeight;

        // Track highest risk level
        if (
          !highestRiskLevel ||
          RISK_LEVEL_ORDER[rule.riskLevel] > RISK_LEVEL_ORDER[highestRiskLevel]
        ) {
          highestRiskLevel = rule.riskLevel;
        }
      }
    } catch (error) {
      console.error(
        `Error evaluating rule ${rule.ruleType}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("triggeredRules", triggeredRules);

  return {
    riskLevel: highestRiskLevel,
    riskScore,
    triggeredRules,
  };
}
