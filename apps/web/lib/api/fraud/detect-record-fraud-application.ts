import { PartnerProps, ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudEvent } from "@dub/prisma/client";
import { FRAUD_RULES_BY_SCOPE } from "./constants";
import { createFraudEvents } from "./create-fraud-events";

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

  await createFraudEvents(
    triggeredRules.map((rule) => ({
      programId: program.id,
      partnerId: partner.id,
      type: rule.type,
    })),
  );
}
