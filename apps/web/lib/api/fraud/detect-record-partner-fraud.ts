import { FraudPartnerContext } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudEvent, FraudRuleType } from "@dub/prisma/client";
import { fraudPartnerContext } from "../../zod/schemas/schemas";
import { createId } from "../create-id";
import { FRAUD_RULES_BY_SCOPE, FRAUD_RULES_BY_TYPE } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";

export async function detectAndRecordPartnerFraud({
  context,
  ruleTypes,
}: {
  context: FraudPartnerContext;
  ruleTypes?: FraudRuleType[]; // Optional array of rule types to filter by
}) {
  const result = fraudPartnerContext.safeParse(context);

  if (!result.success) {
    return;
  }

  const validatedContext = result.data;

  const allPartnerRules = FRAUD_RULES_BY_SCOPE["partner"];
  const fraudRules = ruleTypes
    ? allPartnerRules.filter((rule) => ruleTypes.includes(rule.type))
    : allPartnerRules;

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

  if (triggeredRules.length === 0) {
    console.log("[detectAndRecordPartnerFraud] No fraud rules were triggered.");
    return;
  }

  console.log("[detectAndRecordPartnerFraud] triggeredRules", triggeredRules);

  const crossProgramRules = triggeredRules.filter(
    (rule) => FRAUD_RULES_BY_TYPE[rule.type].crossProgram,
  );

  let programEnrollments: Array<{ programId: string }> = [];

  // Fetch program enrollments only if we have cross-program rules
  if (crossProgramRules.length > 0) {
    programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: validatedContext.partner.id,
      },
      select: {
        programId: true,
      },
    });
  }

  const fraudEvents: Pick<
    FraudEvent,
    "id" | "programId" | "partnerId" | "type"
  >[] = [];

  // TODO (Fraud):
  // Skip duplicate fraud events for the same rule

  // For each triggered fraud rule, create fraud events based on the rule's scope:
  // - Cross-program rules: Create fraud events for all programs the partner is enrolled in (e.g., duplicate payout method).
  // - Single-program rules: Create fraud event only for the current program context.
  for (const triggeredRule of triggeredRules) {
    const fraudRule = FRAUD_RULES_BY_TYPE[triggeredRule.type];

    if (!fraudRule) {
      continue;
    }

    if (fraudRule.crossProgram) {
      for (const programEnrollment of programEnrollments) {
        fraudEvents.push({
          id: createId({ prefix: "fraud_" }),
          programId: programEnrollment.programId,
          partnerId: validatedContext.partner.id,
          type: triggeredRule.type,
        });
      }
    } else if (validatedContext?.program?.id) {
      fraudEvents.push({
        id: createId({ prefix: "fraud_" }),
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        type: triggeredRule.type,
      });
    }
  }

  if (fraudEvents.length === 0) {
    return;
  }

  try {
    await prisma.fraudEvent.createMany({
      data: fraudEvents,
    });
  } catch (error) {
    console.error(
      "[detectAndRecordPartnerFraud] Error recording partner fraud events.",
      error,
    );
  }
}
