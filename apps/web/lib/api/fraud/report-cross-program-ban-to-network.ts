import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { isFraudRuleEnabled } from "@/lib/api/fraud/get-merged-fraud-rules";
import { prisma } from "@/lib/prisma";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { FraudRuleType, PartnerBannedReason } from "@prisma/client";
import { holdPendingCommissions } from "./hold-pending-commissions";
import { holdProcessedCommissions } from "./hold-processed-commissions";

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
    return;
  }

  // Filter out programs where the partnerCrossProgramBan rule is disabled
  affectedProgramEnrollments = affectedProgramEnrollments.filter((enrollment) =>
    isFraudRuleEnabled({
      fraudRules: enrollment.program.fraudRules,
      ruleType: FraudRuleType.partnerCrossProgramBan,
    }),
  );

  if (affectedProgramEnrollments.length === 0) {
    return;
  }

  const { affectedGroups } = await createFraudEvents(
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

  const results = await Promise.allSettled([
    holdPendingCommissions(affectedGroups),
    holdProcessedCommissions(affectedGroups),
  ]);
  results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .forEach((r) => console.error("Failed to hold commissions:", r.reason));
}
