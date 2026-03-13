import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { getMergedFraudRules } from "@/lib/api/fraud/get-merged-fraud-rules";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType, PartnerBannedReason } from "@dub/prisma/client";

// Creates partnerCrossProgramBan fraud events in other programs where the partner is enrolled.
// Used when a program bans a partner so that other programs can be alerted about cross-program
// fraud risk. Only programs with the partnerCrossProgramBan rule enabled receive events.
export async function reportCrossProgramBanToNetwork({
  partnerId,
  programId,
  bannedReason,
  bannedAt,
}: {
  partnerId: string;
  programId: string; // The program that issued the ban
  bannedReason: PartnerBannedReason | null;
  bannedAt: Date | null;
}) {
  let affectedProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId,
      programId: {
        not: programId,
      },
      status: {
        notIn: INACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      programId: true,
      partnerId: true,
      program: {
        select: {
          fraudRules: true,
        },
      },
    },
  });

  if (affectedProgramEnrollments.length === 0) {
    return;
  }

  // Filter out programs where the partnerCrossProgramBan rule is disabled
  if (affectedProgramEnrollments.length > 0) {
    affectedProgramEnrollments = affectedProgramEnrollments.filter(
      (enrollment) => {
        const mergedFraudRules = getMergedFraudRules(
          enrollment.program.fraudRules,
        );

        const fraudRule = mergedFraudRules.find(
          (rule) => rule.type === FraudRuleType.partnerCrossProgramBan,
        );

        return fraudRule ? fraudRule.enabled : true;
      },
    );
  }

  if (affectedProgramEnrollments.length === 0) {
    return;
  }

  await createFraudEvents(
    affectedProgramEnrollments.map((affectedEnrollment) => ({
      programId: affectedEnrollment.programId,
      partnerId: affectedEnrollment.partnerId,
      type: FraudRuleType.partnerCrossProgramBan,
      sourceProgramId: programId,
      metadata: {
        bannedReason,
        bannedAt,
      },
    })),
  );
}
