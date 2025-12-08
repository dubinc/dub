import { CreateFraudEventInput } from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType, ProgramEnrollment } from "@dub/prisma/client";
import { createFraudEvents } from "./create-fraud-events";

// Check for duplicate payout methods: if multiple partners share the same payout method hash,
// create fraud events for all their active program enrollments to flag potential fraud
export async function detectDuplicatePayoutMethodFraud(
  payoutMethodHash: string,
): Promise<void> {
  if (!payoutMethodHash) {
    return;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partner: {
        payoutMethodHash,
      },
    },
    select: {
      programId: true,
      partnerId: true,
      status: true,
    },
  });

  if (programEnrollments.length === 0) {
    return;
  }

  // Group partners by program enrollment
  let partnersByProgram = programEnrollments.reduce((map, e) => {
    if (!map.has(e.programId)) {
      map.set(e.programId, []);
    }
    map.get(e.programId)!.push({ partnerId: e.partnerId, status: e.status });
    return map;
  }, new Map<string, Pick<ProgramEnrollment, "partnerId" | "status">[]>());

  // Filter out programs with only one partner
  partnersByProgram = new Map(
    Array.from(partnersByProgram.entries()).filter(
      ([_, partners]) => partners.length > 1,
    ),
  );

  if (partnersByProgram.size === 0) {
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
          type: FraudRuleType.partnerDuplicatePayoutMethod,
          metadata: {
            payoutMethodHash,
            duplicatePartnerId: enrolledPartner.partnerId,
          },
        });
      }
    }
  }

  await createFraudEvents(fraudEvents);
}
