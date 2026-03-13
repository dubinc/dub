import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { isFraudRuleEnabled } from "@/lib/api/fraud/get-merged-fraud-rules";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";

// Creates fraud report events in other programs where the given partners are enrolled.
// Used when a program rejects (and reports) a partner so that other programs can be
// alerted about suspected fraud. Only programs with the partnerFraudReport rule
// enabled receive events.
export async function reportFraudToNetwork({
  programId,
  partnerIds,
}: {
  programId: string; // The program that reported the fraud,
  partnerIds: string[];
}) {
  if (partnerIds.length === 0) {
    return;
  }

  let affectedProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
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

  // Filter out programs where the partnerFraudReport rule is disabled
  if (affectedProgramEnrollments.length > 0) {
    affectedProgramEnrollments = affectedProgramEnrollments.filter(
      (enrollment) =>
        isFraudRuleEnabled({
          programRules: enrollment.program.fraudRules,
          ruleType: FraudRuleType.partnerFraudReport,
        }),
    );
  }

  if (affectedProgramEnrollments.length === 0) {
    return;
  }

  await createFraudEvents(
    affectedProgramEnrollments.map((affectedEnrollment) => ({
      programId: affectedEnrollment.programId,
      partnerId: affectedEnrollment.partnerId,
      type: FraudRuleType.partnerFraudReport,
      sourceProgramId: programId,
    })),
  );
}
