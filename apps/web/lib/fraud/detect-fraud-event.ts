import { prisma } from "@dub/prisma";
import { EventType, FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { z } from "zod";
import { DEFAULT_FRAUD_RULES } from "./default-fraud-rules";
import type { FraudReasonCode } from "./fraud-reason-codes";
import { fraudRuleRegistry } from "./fraud-rules-registry";

interface TriggeredRule {
  ruleId?: string; // Only present if it's a program override
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

export const conversionEventSchema = z.object({
  programId: z.string(),
  partner: z.object({
    id: z.string(),
    email: z.string().nullable().default(null),
    name: z.string().nullable().default(null),
  }),
  customer: z.object({
    id: z.string(),
    email: z.string().nullable().default(null),
    name: z.string().nullable().default(null),
  }),
  event: z.object({
    id: z.string(),
    type: z.nativeEnum(EventType),
    timestamp: z.string(),
  }),
  click: z.object({
    ip: z.string().nullable().default(null),
    referer: z.string().nullable().default(null),
    country: z.string().nullable().default(null),
    timestamp: z.string().nullable().default(null),
  }),
});

// Risk level weights for calculating risk score
const RISK_LEVEL_WEIGHTS: Record<FraudRiskLevel, number> = {
  high: 10,
  medium: 5,
  low: 1,
};

// Risk level order for determining overall risk level
const RISK_LEVEL_ORDER: Record<FraudRiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Evaluate fraud risk for a conversion event
// Executes all enabled rules and calculates risk score
export async function detectFraudEvent(
  data: z.infer<typeof conversionEventSchema>,
): Promise<FraudEvaluationResult> {
  const parsedConversionEvent = conversionEventSchema.parse(data);
  const { programId } = parsedConversionEvent;

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId,
    },
  });

  // Merge global rules with program overrides
  const activeRules = DEFAULT_FRAUD_RULES.map((globalRule) => {
    const override = programRules.find(
      (o) => o.ruleType === globalRule.ruleType,
    );

    // Program override exists - use it
    if (override) {
      return {
        id: override.id,
        ruleType: override.ruleType,
        riskLevel: override.riskLevel,
        name: override.name,
        config: override.config ?? globalRule.config,
      };
    }

    // No override - use global default
    return {
      id: undefined,
      ruleType: globalRule.ruleType,
      riskLevel: globalRule.riskLevel,
      name: globalRule.name,
      config: globalRule.config,
    };
  });

  let riskScore = 0;
  let highestRiskLevel: FraudRiskLevel | null = null;
  const triggeredRules: TriggeredRule[] = [];

  // Evaluate each rule
  for (const rule of activeRules) {
    const ruleEvaluatorFn = fraudRuleRegistry[rule.ruleType];

    if (!ruleEvaluatorFn) {
      console.warn(`No evaluator found for rule type ${rule.ruleType}`);
      continue;
    }

    try {
      // Evaluate rule
      const result = await ruleEvaluatorFn(parsedConversionEvent, rule.config);

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

  return {
    riskLevel: highestRiskLevel,
    riskScore,
    triggeredRules,
  };
}
