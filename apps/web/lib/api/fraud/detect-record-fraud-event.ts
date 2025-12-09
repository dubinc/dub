import { CreateFraudEventInput, FraudEventContext } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { fraudEventContext } from "../../zod/schemas/schemas";
import { createFraudEvents } from "./create-fraud-events";
import { executeFraudRule } from "./execute-fraud-rule";
import { getMergedFraudRules } from "./get-merged-fraud-rules";

export async function detectAndRecordFraudEvent(context: FraudEventContext) {
  const result = fraudEventContext.safeParse(context);

  if (!result.success) {
    console.error(
      `[detectAndRecordFraudEvent] Invalid context ${result.error}`,
    );
    return;
  }

  const validatedContext = result.data;

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: validatedContext.program.id,
    },
  });

  // Override global rules with program-specific overrides
  const mergedRules = getMergedFraudRules(programRules);
  const activeRules = mergedRules.filter((rule) => rule.enabled);

  const triggeredRules: Pick<CreateFraudEventInput, "type" | "metadata">[] = [];

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

  if (triggeredRules.length === 0) {
    return;
  }

  await createFraudEvents(
    triggeredRules.map((rule) => ({
      programId: validatedContext.program.id,
      partnerId: validatedContext.partner.id,
      linkId: validatedContext.link.id,
      customerId: validatedContext.customer.id,
      eventId: validatedContext.event.id,
      type: rule.type,
      metadata: rule.metadata,
    })),
  );
}
