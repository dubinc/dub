import { prisma } from "@/lib/prisma";
import { CreateFraudEventInput, PartnerProps, ProgramProps } from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { FraudRuleType } from "@prisma/client";
import { createFraudEvents } from "./create-fraud-events";
import { isFraudRuleEnabled } from "./get-merged-fraud-rules";

interface FraudApplicationContext {
  program: Pick<ProgramProps, "id">;
  partner: Pick<PartnerProps, "id"> & {
    payoutMethodHash: string | null;
    cryptoWalletAddress: string | null;
  };
}

// Detect and record fraud events for the partner when they apply to a program (partnerDuplicateAccount fraud rule)
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

  // Check if partner shares the same payoutMethodHash or cryptoWalletAddress with other partners
  // indicates potential duplicate account fraud
  if (
    isFraudRuleEnabled({
      fraudRules,
      ruleType: FraudRuleType.partnerDuplicateAccount,
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
              riskMonitoringDisabledAt: true,
            },
          },
        },
      });

      if (duplicatePartners.length > 1) {
        for (const sourcePartner of duplicatePartners) {
          const programEnrollment = sourcePartner.programs[0];

          // Skip if the partner is inactive or risk detection is disabled
          if (
            INACTIVE_ENROLLMENT_STATUSES.includes(programEnrollment.status) ||
            programEnrollment.riskMonitoringDisabledAt
          ) {
            continue;
          }

          for (const conflictingPartner of duplicatePartners) {
            fraudEvents.push({
              programId: program.id,
              partnerId: sourcePartner.id,
              type: FraudRuleType.partnerDuplicateAccount,
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
