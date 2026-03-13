import { CreateFraudEventInput, PartnerProps, ProgramProps } from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { createFraudEvents } from "./create-fraud-events";
import { isFraudRuleEnabled } from "./get-merged-fraud-rules";

interface FraudApplicationContext {
  program: Pick<ProgramProps, "id">;
  partner: Pick<PartnerProps, "id"> & {
    payoutMethodHash: string | null;
    cryptoWalletAddress: string | null;
  };
}

// Detect and record fraud events for the partner when they apply to a program
// Checks for cross-program bans and duplicate payout methods
export async function detectAndRecordFraudApplication({
  context: { program, partner },
}: {
  context: FraudApplicationContext;
}) {
  const fraudEvents: CreateFraudEventInput[] = [];

  const fraudRules = await prisma.fraudRule.findMany({
    where: {
      programId: program.id,
    },
  });

  // Check if partner has been banned in other programs
  // indicates cross-program fraud risk
  if (
    isFraudRuleEnabled({
      programRules: fraudRules,
      ruleType: FraudRuleType.partnerCrossProgramBan,
    })
  ) {
    const bannedProgramEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: partner.id,
        programId: {
          not: program.id,
        },
        status: "banned",
      },
      select: {
        programId: true,
        bannedReason: true,
        bannedAt: true,
        program: {
          select: {
            fraudRules: true,
          },
        },
      },
    });

    // Create a fraud event for each program that banned the partner
    if (bannedProgramEnrollments.length > 0) {
      for (const bannedEnrollment of bannedProgramEnrollments) {
        fraudEvents.push({
          programId: program.id,
          partnerId: partner.id,
          type: FraudRuleType.partnerCrossProgramBan,
          sourceProgramId: bannedEnrollment.programId,
          metadata: {
            bannedReason: bannedEnrollment.bannedReason,
            bannedAt: bannedEnrollment.bannedAt,
          },
        });
      }
    }
  }

  // Check if partner shares the same payoutMethodHash or cryptoWalletAddress with other partners
  // indicates potential duplicate account fraud
  if (
    isFraudRuleEnabled({
      programRules: fraudRules,
      ruleType: FraudRuleType.partnerDuplicatePayoutMethod,
    })
  ) {
    const { payoutMethodHash, cryptoWalletAddress } = partner;

    if (payoutMethodHash || cryptoWalletAddress) {
      const duplicatePartners = await prisma.partner.findMany({
        where: {
          programs: {
            some: {
              programId: program.id,
            },
          },
          OR: [
            ...(payoutMethodHash ? [{ payoutMethodHash }] : []),
            ...(cryptoWalletAddress ? [{ cryptoWalletAddress }] : []),
          ],
        },
        select: {
          id: true,
          payoutMethodHash: true,
          cryptoWalletAddress: true,
          programs: {
            where: {
              programId: program.id,
            },
            select: {
              status: true,
            },
          },
        },
      });

      if (duplicatePartners.length > 1) {
        // For each partner, create fraud events pointing to all duplicates
        for (const sourcePartner of duplicatePartners) {
          const programEnrollment = sourcePartner.programs[0];

          if (
            INACTIVE_ENROLLMENT_STATUSES.includes(programEnrollment?.status)
          ) {
            continue;
          }

          for (const conflictingPartner of duplicatePartners) {
            fraudEvents.push({
              programId: program.id,
              partnerId: sourcePartner.id,
              type: FraudRuleType.partnerDuplicatePayoutMethod,
              metadata: {
                ...(payoutMethodHash ? { payoutMethodHash } : {}),
                ...(cryptoWalletAddress ? { cryptoWalletAddress } : {}),
                duplicatePartnerId: conflictingPartner.id,
              },
            });
          }
        }
      }
    }
  }

  await createFraudEvents(fraudEvents);
}
