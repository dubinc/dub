import { CreateFraudEventInput, PartnerProps, ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
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
  const fraudEvents: CreateFraudEventInput[] = [];

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
    fraudEvents.push({
      programId: program.id,
      partnerId: partner.id,
      type: FraudRuleType.partnerCrossProgramBan,
      metadata: null,
    });
  }

  // Check if partner shares the same payout method hash with other partners
  // indicates potential duplicate account fraud
  if (partner.payoutMethodHash) {
    const duplicatePartners = await prisma.partner.findMany({
      where: {
        payoutMethodHash: partner.payoutMethodHash,
        programs: {
          some: {
            programId: program.id,
          },
        },
      },
      select: {
        id: true,
        payoutMethodHash: true,
      },
    });

    if (duplicatePartners.length > 1) {
      // For each partner, create fraud events pointing to all duplicates
      for (const sourcePartner of duplicatePartners) {
        for (const conflictingPartner of duplicatePartners) {
          fraudEvents.push({
            programId: program.id,
            partnerId: sourcePartner.id,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
            metadata: {
              payoutMethodHash: partner.payoutMethodHash,
              duplicatePartnerId: conflictingPartner.id,
            },
          });
        }
      }
    }
  }

  await createFraudEvents(fraudEvents);
}
