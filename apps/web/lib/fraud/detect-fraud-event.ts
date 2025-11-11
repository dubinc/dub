import { prisma } from "@dub/prisma";
import { EventType, FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { DEFAULT_HIGH_RISK_RULES } from "./default-fraud-rules";
import type { FraudReasonCode } from "./reason-codes";
import { getFraudReasonMessage } from "./reason-codes";
import { fraudRuleRegistry } from "./rules/fraud-rule-registry";
import type { FraudRuleContext } from "./types";

export interface ConversionEventData {
  programId: string;
  partnerId: string;
  customerId?: string;
  linkId?: string;
  eventId?: string;
  eventType: EventType;
  // Click event data
  clickData: {
    ip: string;
    referer: string;
    country: string;
    timestamp: string;
    // ... other click data fields
  };
  // Customer data
  customerEmail?: string | null;
  customerIP?: string | null;
  // Partner data
  partnerEmail?: string | null;
}

export interface TriggeredRule {
  ruleId?: string; // Only present if it's a program override
  ruleType: FraudRuleType;
  riskLevel: FraudRiskLevel;
  name: string;
  reason: string; // Human-readable (for backward compatibility)
  reasonCode?: FraudReasonCode; // Structured code (for querying)
  metadata?: Record<string, unknown>;
}

export interface FraudEvaluationResult {
  riskLevel: FraudRiskLevel | null;
  riskScore: number;
  triggeredRules: TriggeredRule[];
  metadata: Record<string, unknown>;
}

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
  eventData: ConversionEventData,
): Promise<FraudEvaluationResult> {
  // Get global default rules (hardcoded)
  const globalRules = DEFAULT_HIGH_RISK_RULES.filter((rule) => rule.enabled);

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: eventData.programId,
    },
  });

  // Merge global rules with program overrides
  const activeRules = globalRules.map((globalRule) => {
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
        config: (override.config as Record<string, unknown>) || globalRule.config,
        isOverride: true,
      };
    }

    // No override - use global default
    return {
      id: undefined,
      ruleType: globalRule.ruleType,
      riskLevel: globalRule.riskLevel,
      name: globalRule.name,
      config: globalRule.config,
      isOverride: false,
    };
  });

  let riskScore = 0;
  let highestRiskLevel: FraudRiskLevel | null = null;
  const triggeredRules: TriggeredRule[] = [];
  const aggregatedMetadata: Record<string, unknown> = {
    evaluatedAt: new Date().toISOString(),
    programId: eventData.programId,
    partnerId: eventData.partnerId,
    eventType: eventData.eventType,
    rulesEvaluated: activeRules.length,
  };

  // Evaluate each rule
  for (const rule of activeRules) {
    const evaluator = fraudRuleRegistry[rule.ruleType];

    if (!evaluator) {
      console.warn(`No evaluator found for rule type: ${rule.ruleType}`);
      continue;
    }

    try {
      // Build context for this rule
      const context = (await buildRuleContext(
        rule.ruleType,
        eventData,
      )) as FraudRuleContext;

      // Evaluate rule
      const result = await evaluator(context, rule.config);

      if (result.triggered) {
        // Rule triggered - add to triggered rules
        const reasonMessage = result.reasonCode
          ? getFraudReasonMessage(result.reasonCode)
          : `${rule.name} triggered`;

        triggeredRules.push({
          ruleId: rule.id,
          ruleType: rule.ruleType,
          riskLevel: rule.riskLevel,
          name: rule.name,
          reason: reasonMessage,
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

        // Aggregate metadata
        if (result.metadata) {
          aggregatedMetadata[rule.ruleType] = result.metadata;
        }
      }
    } catch (error) {
      console.error(
        `Error evaluating rule ${rule.ruleType}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Continue with other rules even if one fails
    }
  }

  // Add summary metadata
  aggregatedMetadata.triggeredRulesCount = triggeredRules.length;
  aggregatedMetadata.riskScore = riskScore;
  aggregatedMetadata.highestRiskLevel = highestRiskLevel;

  return {
    riskLevel: highestRiskLevel,
    riskScore,
    triggeredRules,
    metadata: aggregatedMetadata,
  };
}

/**
 * Build context object for a specific rule type
 */
async function buildRuleContext(
  ruleType: FraudRuleType,
  eventData: ConversionEventData,
): Promise<unknown> {
  switch (ruleType) {
    case "customer_ip_suspicious":
      return {
        customerIP: eventData.customerIP || eventData.clickData.ip,
        clickData: eventData.clickData,
      };

    case "self_referral": {
      const [partner, customer] = await Promise.all([
        eventData.partnerId
          ? prisma.partner.findUnique({
              where: { id: eventData.partnerId },
              select: { name: true, email: true },
            })
          : null,
        eventData.customerId
          ? prisma.customer.findUnique({
              where: { id: eventData.customerId },
              select: { name: true, email: true },
            })
          : null,
      ]);

      return {
        partner: {
          name: partner?.name ?? "",
          email: partner?.email ?? eventData.partnerEmail,
        },
        customer: {
          name: customer?.name ?? "",
          email: customer?.email ?? eventData.customerEmail,
        },
      };
    }

    // Add more cases as rules are implemented
    case "customer_email_suspicious_domain":
      return {
        customerEmail: eventData.customerEmail,
      };

    case "customer_ip_country_mismatch":
      return {
        customerIP: eventData.customerIP || eventData.clickData.ip,
        customerCountry: eventData.clickData.country,
      };

    case "banned_referral_domain":
      return {
        referer: eventData.clickData.referer,
        programId: eventData.programId,
      };

    case "suspicious_activity_spike":
      return {
        partnerId: eventData.partnerId,
        programId: eventData.programId,
        eventType: eventData.eventType,
        currentTimestamp: new Date(),
      };

    case "paid_ad_traffic_detected":
      return {
        referer: eventData.clickData.referer,
        clickData: eventData.clickData,
        programId: eventData.programId,
      };

    case "abnormally_fast_conversion":
      return {
        clickTimestamp: eventData.clickData.timestamp,
        eventType: eventData.eventType,
        currentTimestamp: new Date(),
      };

    default:
      return eventData;
  }
}