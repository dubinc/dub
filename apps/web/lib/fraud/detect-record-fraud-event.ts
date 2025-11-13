import { prisma } from "@dub/prisma";
import { FraudRiskLevel, Prisma } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { RISK_LEVEL_ORDER, RISK_LEVEL_WEIGHTS } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";
import { getMergedFraudRules } from "./get-merged-fraud-rules";
import { FraudTriggeredRule } from "./types";

interface DetectFraudEventProps {
  program: {
    id: string;
  };
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
  commission: {
    id: string | null | undefined;
  };
  link: {
    id: string | null | undefined;
  };
  click: {
    url: string | null;
    referer: string | null;
  };
  event: {
    id: string;
  };
}

// Evaluate fraud risk for a conversion event
// Executes all enabled rules and calculates risk score
export async function detectAndRecordFraudEvent(
  context: DetectFraudEventProps,
) {
  console.debug("[detectAndRecordFraudEvent] context", context);

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: context.program.id,
    },
  });

  // Merge global rules with program overrides
  const mergedRules = getMergedFraudRules(programRules);
  const activeRules = mergedRules.filter((rule) => rule.enabled);

  let riskScore = 0;
  let riskLevel: FraudRiskLevel = "low";
  const triggeredRules: FraudTriggeredRule[] = [];

  console.debug("[detectAndRecordFraudEvent] active rules", activeRules);

  // Evaluate each rule
  for (const rule of activeRules) {
    try {
      // Evaluate rule
      const result = await executeFraudRule(rule.type, context, rule.config);

      // Rule triggered
      if (result.triggered) {
        triggeredRules.push({
          ruleType: rule.type,
          riskLevel: rule.riskLevel,
          reason: result.reason,
          metadata: result.metadata,
        });

        // Add to risk score
        const ruleWeight = RISK_LEVEL_WEIGHTS[rule.riskLevel];
        riskScore += ruleWeight;

        // Track highest risk level
        if (
          !riskLevel ||
          RISK_LEVEL_ORDER[rule.riskLevel] > RISK_LEVEL_ORDER[riskLevel]
        ) {
          riskLevel = rule.riskLevel;
        }
      }
    } catch (error) {
      console.error(
        `Error evaluating rule ${rule.type}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.debug("[detectAndRecordFraudEvent] triggeredRules", triggeredRules);

  try {
    const fraudEvent = await prisma.fraudEvent.create({
      data: {
        id: createId({ prefix: "fraud_" }),
        programId: context.program.id,
        partnerId: context.partner.id,
        linkId: context.link.id,
        customerId: context.customer.id,
        eventId: context.event.id,
        commissionId: context.commission.id,
        riskLevel,
        riskScore,
        triggeredRules: triggeredRules as unknown as Prisma.InputJsonValue,
      },
    });

    console.debug("[detectAndRecordFraudEvent] fraudEvent", fraudEvent);

    return fraudEvent;
  } catch (error) {
    console.error("Error recording fraud event", error);
    return null;
  }
}
