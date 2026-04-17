import { CreateFraudEventInput } from "@/lib/types";
import { VeriffDecisionEvent } from "@/lib/veriff/schema";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType, ProgramEnrollment } from "@dub/prisma/client";
import { createFraudEvents } from "./create-fraud-events";
import { isFraudRuleEnabled } from "./get-merged-fraud-rules";

// Check for duplicate identities: if multiple partners share the same identity,
// create fraud events for all their active program enrollments to flag potential fraud
export async function detectDuplicateIdentityFraud({
  veriffSessionId,
  riskLabels,
}: {
  veriffSessionId: string;
  riskLabels: VeriffDecisionEvent["verification"]["riskLabels"];
}) {
  if (!riskLabels || riskLabels.length === 0) {
    console.log("[detectDuplicateIdentityFraud] No risk labels provided.");

    return;
  }

  let veriffSessionIds = riskLabels.map(({ sessionIds }) => sessionIds).flat();

  // Add the current veriff session id to the list
  veriffSessionIds.push(veriffSessionId);

  // Remove duplicates
  veriffSessionIds = [...new Set(veriffSessionIds)];

  if (veriffSessionIds.length === 0) {
    console.log(
      "[detectDuplicateIdentityFraud] No veriff session ids provided.",
    );
    return;
  }

  let programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partner: {
        veriffSessionId: {
          in: veriffSessionIds,
        },
      },
    },
    select: {
      programId: true,
      partnerId: true,
      status: true,
      program: {
        select: {
          fraudRules: true,
        },
      },
    },
  });

  if (programEnrollments.length === 0) {
    console.log("[detectDuplicateIdentityFraud] No program enrollments found.");
    return;
  }

  // Filter out program enrollments where the partnerDuplicateAccount rule is disabled
  programEnrollments = programEnrollments.filter((enrollment) =>
    isFraudRuleEnabled({
      fraudRules: enrollment.program.fraudRules,
      ruleType: FraudRuleType.partnerDuplicatePayoutMethod, // TODO: Change to partnerDuplicateAccount
    }),
  );

  // Group partners by program enrollment
  let partnersByProgram = programEnrollments.reduce((map, e) => {
    if (!map.has(e.programId)) {
      map.set(e.programId, []);
    }

    map.get(e.programId)!.push({
      partnerId: e.partnerId,
      status: e.status,
    });

    return map;
  }, new Map<string, Pick<ProgramEnrollment, "partnerId" | "status">[]>());

  // Filter out programs with only one partner
  partnersByProgram = new Map(
    Array.from(partnersByProgram.entries()).filter(
      ([_, partners]) => partners.length > 1,
    ),
  );

  if (partnersByProgram.size === 0) {
    console.log("[detectDuplicateIdentityFraud] No multiple partners found.");
    return;
  }

  const fraudEvents: CreateFraudEventInput[] = [];

  for (const [programId, partners] of partnersByProgram.entries()) {
    for (const sourcePartner of partners) {
      if (INACTIVE_ENROLLMENT_STATUSES.includes(sourcePartner.status)) {
        continue;
      }

      for (const enrolledPartner of partners) {
        fraudEvents.push({
          programId,
          partnerId: sourcePartner.partnerId,
          type: FraudRuleType.partnerDuplicateAccount,
          metadata: {
            duplicatePartnerId: enrolledPartner.partnerId,
          },
        });
      }
    }
  }

  await createFraudEvents(fraudEvents);
}
