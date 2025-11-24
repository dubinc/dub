import { FraudEventContext } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudEvent, Prisma } from "@dub/prisma/client";
import { fraudEventContext } from "../../zod/schemas/schemas";
import { createId } from "../create-id";
import { executeFraudRule } from "./execute-fraud-rule";
import { getMergedFraudRules } from "./get-merged-fraud-rules";
import { createFraudEventGroupKey } from "./utils";

export async function detectAndRecordFraudEvent(context: FraudEventContext) {
  const result = fraudEventContext.safeParse(context);

  if (!result.success) {
    return;
  }

  const validatedContext = result.data;

  console.info(
    `Running detectAndRecordFraudEvent for context ${JSON.stringify(context, null, 2)}`,
  );

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: context.program.id,
    },
  });

  // Override global rules with program-specific overrides
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

  if (triggeredRules.length === 0) {
    return;
  }

  console.log(
    `[detectAndRecordFraudEvents] triggeredRules ${JSON.stringify(triggeredRules, null, 2)}`,
  );

  try {
    await prisma.fraudEvent.createMany({
      data: triggeredRules.map((rule) => ({
        id: createId({ prefix: "fre_" }),
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        linkId: validatedContext.link.id,
        customerId: validatedContext.customer.id,
        eventId: validatedContext.event.id,
        commissionId: validatedContext.commission.id,
        type: rule.type,
        metadata: rule.metadata as Prisma.InputJsonValue,
        groupKey: createFraudEventGroupKey({
          programId: validatedContext.program.id,
          partnerId: validatedContext.partner.id,
          type: rule.type,
        }),
      })),
    });
  } catch (error) {
    console.error(
      "[detectAndRecordFraudEvents] Error recording fraud event",
      error,
    );
  }
}
