import { PartnerProps, ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudEvent } from "@dub/prisma/client";
import { createId } from "../create-id";
import { FRAUD_RULES_BY_SCOPE } from "./constants";
import { createFraudEventGroupKey } from "./utils";

interface FraudApplicationContext {
  program: Pick<ProgramProps, "id">;
  partner: Pick<PartnerProps, "id"> & { payoutMethodHash: string | null };
}

// Detect and record fraud events for the partner when they apply to a program
// Checks for cross-program bans and duplicate payout methods
export async function detectAndRecordFraudApplication({
  context,
}: {
  context: FraudApplicationContext;
}) {
  const fraudRules = FRAUD_RULES_BY_SCOPE["partner"];

  if (fraudRules.length === 0) {
    return;
  }

  const { partner, program } = context;
  const triggeredRules: Pick<FraudEvent, "type">[] = [];

  // Check if partner has been banned in other programs
  // indicates cross-program fraud risk
  const bannedProgramEnrollments = await prisma.programEnrollment.count({
    where: {
      partnerId: partner.id,
      programId: {
        not: program.id,
      },
      status: "banned",
    },
  });

  if (bannedProgramEnrollments > 0) {
    triggeredRules.push({
      type: "partnerCrossProgramBan",
    });
  }

  // Check if partner shares the same payout method hash with other partners
  // indicates potential duplicate account fraud
  if (partner.payoutMethodHash) {
    const duplicatePartners = await prisma.partner.count({
      where: {
        payoutMethodHash: partner.payoutMethodHash,
      },
    });

    if (duplicatePartners > 1) {
      triggeredRules.push({
        type: "partnerDuplicatePayoutMethod",
      });
    }
  }

  if (triggeredRules.length === 0) {
    return;
  }

  const fraudEvents: Pick<
    FraudEvent,
    "id" | "programId" | "partnerId" | "type" | "groupKey"
  >[] = [];

  for (const triggeredRule of triggeredRules) {
    const groupKey = createFraudEventGroupKey({
      programId: program.id,
      partnerId: partner.id,
      type: triggeredRule.type,
    });

    fraudEvents.push({
      id: createId({ prefix: "fre_" }),
      programId: program.id,
      partnerId: partner.id,
      type: triggeredRule.type,
      groupKey,
    });
  }

  try {
    await prisma.fraudEvent.createMany({
      data: fraudEvents,
    });
  } catch (error) {
    console.error(
      "[detectAndRecordFraudApplication] Error recording partner fraud events.",
      error,
    );
  }
}
