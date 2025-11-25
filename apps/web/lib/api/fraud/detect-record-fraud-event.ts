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

  // Get program-specific rule overrides
  const programRules = await prisma.fraudRule.findMany({
    where: {
      programId: validatedContext.program.id,
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

  try {
    // Deduplicate events: prevent duplicate fraud events for the same
    // program + partner + customer + type + status combination by filtering out
    // triggered rules that already have a corresponding pending event.
    const previousEvents = await prisma.fraudEvent.findMany({
      where: {
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        customerId: validatedContext.customer.id,
        status: "pending",
        type: {
          in: triggeredRules.map((rule) => rule.type),
        },
      },
    });

    const existingEventTypes =
      previousEvents.length > 0
        ? new Set(previousEvents.map((e) => e.type))
        : new Set<string>();

    const newEvents = triggeredRules.filter(
      (rule) => !existingEventTypes.has(rule.type),
    );

    if (newEvents.length === 0) {
      return;
    }

    console.log(
      `[detectAndRecordFraudEvents] fraud events detected ${JSON.stringify(newEvents, null, 2)}`,
    );

    await prisma.fraudEvent.createMany({
      data: newEvents.map((event) => ({
        id: createId({ prefix: "fre_" }),
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        linkId: validatedContext.link.id,
        customerId: validatedContext.customer.id,
        eventId: validatedContext.event.id,
        commissionId: validatedContext.commission.id,
        type: event.type,
        metadata: event.metadata as Prisma.InputJsonValue,
        groupKey: createFraudEventGroupKey({
          programId: validatedContext.program.id,
          partnerId: validatedContext.partner.id,
          type: event.type,
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
