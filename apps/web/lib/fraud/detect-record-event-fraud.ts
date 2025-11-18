import { prisma } from "@dub/prisma";
import { FraudEvent, Prisma } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { executeFraudRule } from "./execute-fraud-rule";
import { getMergedFraudRules } from "./get-merged-fraud-rules";
import { fraudEventContext } from "./schemas";
import { FraudEventContext } from "./types";

export async function detectAndRecordEventFraud(context: FraudEventContext) {
  const result = fraudEventContext.safeParse(context);

  if (!result.success) {
    return;
  }

  const validatedContext = result.data;

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
      const { triggered, metadata } = await executeFraudRule({
        type: rule.type,
        config: rule.config,
        context: validatedContext,
      });

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
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        linkId: validatedContext.link.id,
        customerId: validatedContext.customer.id,
        eventId: validatedContext.event.id,
        commissionId: validatedContext.commission.id,
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
