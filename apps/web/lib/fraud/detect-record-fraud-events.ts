import { prisma } from "@dub/prisma";
import { FraudEvent, Prisma } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { executeFraudRule } from "./execute-fraud-rule";
import { getMergedFraudRules } from "./get-merged-fraud-rules";

interface DetectFraudEventProps {
  program: {
    id: string;
  };
  partner: {
    id: string;
    email: string | null;
    name: string | null;
    safelistedAt: Date | null;
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
export async function detectAndRecordFraudEvents(
  context: DetectFraudEventProps,
) {
  if (context.partner.safelistedAt) {
    console.log(
      "[detectAndRecordFraudEvents] The partner is marked as trusted for this program. Skipping fraud risk evaluation.",
    );
    return null;
  }

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: context.program.id,
    },
  });

  // Merge global rules with program overrides
  const mergedRules = getMergedFraudRules(programRules);
  const activeRules = mergedRules.filter((rule) => rule.enabled);

  const triggeredRules: Pick<FraudEvent, "type" | "metadata">[] = [];

  // Evaluate each rule
  for (const rule of activeRules) {
    try {
      const { triggered, metadata } = await executeFraudRule(
        rule.type,
        context,
        rule.config,
      );

      if (triggered) {
        triggeredRules.push({
          type: rule.type,
          metadata: metadata as unknown as Prisma.JsonValue,
        });
      }
    } catch (error) {
      console.error(
        `[detectAndRecordFraudEvents] Error evaluating rule ${rule.type}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("[detectAndRecordFraudEvents] triggeredRules", triggeredRules);

  try {
    return await prisma.fraudEvent.createMany({
      data: triggeredRules.map((rule) => ({
        id: createId({ prefix: "fraud_" }),
        programId: context.program.id,
        partnerId: context.partner.id,
        linkId: context.link.id,
        customerId: context.customer.id,
        eventId: context.event.id,
        commissionId: context.commission.id,
        type: rule.type,
        metadata: rule.metadata as Prisma.InputJsonValue,
      })),
    });
  } catch (error) {
    console.error(
      "[detectAndRecordFraudEvents] Error recording fraud event",
      error,
    );
    return null;
  }
}
