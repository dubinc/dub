import { prisma } from "@dub/prisma";
import { FraudEvent } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { FRAUD_RULES_BY_SCOPE } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";
import { fraudPartnerContext } from "./schemas";
import { FraudPartnerContext } from "./types";

export async function detectAndRecordPartnerFraud(
  context: FraudPartnerContext,
) {
  const result = fraudPartnerContext.safeParse(context);

  if (!result.success) {
    return;
  }

  const validatedContext = result.data;
  const fraudRules = FRAUD_RULES_BY_SCOPE["partner"];

  if (fraudRules.length === 0) {
    console.log(
      "[detectAndRecordPartnerFraud] No fraud rules found with scope partner.",
    );
    return;
  }

  const triggeredRules: Pick<FraudEvent, "type">[] = [];

  // Evaluate each rule
  for (const rule of fraudRules) {
    try {
      const { triggered } = await executeFraudRule({
        type: rule.type,
        context: validatedContext,
      });

      if (triggered) {
        triggeredRules.push({
          type: rule.type,
        });
      }
    } catch (error) {
      console.error(
        `[detectAndRecordPartnerFraud] Error evaluating rule ${rule.type}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("[detectAndRecordPartnerFraud] triggeredRules", triggeredRules);

  try {
    await prisma.fraudEvent.createMany({
      data: triggeredRules.map((rule) => ({
        id: createId({ prefix: "fraud_" }),
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        type: rule.type,
      })),
    });
  } catch (error) {
    console.error(
      "[detectAndRecordPartnerFraud] Error recording partner fraud events.",
      error,
    );
  }
}
