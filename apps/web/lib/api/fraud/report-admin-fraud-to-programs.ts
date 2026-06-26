import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { isFraudRuleEnabled } from "@/lib/api/fraud/get-merged-fraud-rules";
import { prisma } from "@/lib/prisma";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { FraudRuleType } from "@prisma/client";

export async function reportAdminFraudToPrograms({
  partnerId,
}: {
  partnerId: string;
}) {
  const bannedAt = new Date();

  let affectedProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId,
      programId: {
        not: NETWORK_PROGRAM_ID,
      },
      status: {
        notIn: INACTIVE_ENROLLMENT_STATUSES,
      },
      riskMonitoringDisabledAt: null,
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
    return 0;
  }

  affectedProgramEnrollments = affectedProgramEnrollments.filter((enrollment) =>
    isFraudRuleEnabled({
      fraudRules: enrollment.program.fraudRules,
      ruleType: FraudRuleType.partnerCrossProgramBan,
    }),
  );

  if (affectedProgramEnrollments.length === 0) {
    return 0;
  }

  await createFraudEvents(
    affectedProgramEnrollments.map((enrollment) => ({
      programId: enrollment.programId,
      partnerId: enrollment.partnerId,
      type: FraudRuleType.partnerCrossProgramBan,
      sourceProgramId: NETWORK_PROGRAM_ID,
      metadata: {
        bannedReason: "fraud",
        bannedAt,
      },
    })),
  );

  return affectedProgramEnrollments.length;
}
