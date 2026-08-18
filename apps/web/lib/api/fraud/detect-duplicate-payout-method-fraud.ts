import { prisma } from "@/lib/prisma";
import { CreateFraudEventInput } from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { FraudRuleType, ProgramEnrollment } from "@prisma/client";
import { createFraudEvents } from "./create-fraud-events";
import { isFraudRuleEnabled } from "./get-merged-fraud-rules";
import { holdPendingCommissions } from "./hold-pending-commissions";
import { holdProcessedCommissions } from "./hold-processed-commissions";

type DetectDuplicatePayoutMethodFraudOptions =
  | { payoutMethodHash: string; cryptoWalletAddress?: never }
  | { cryptoWalletAddress: string; payoutMethodHash?: never };

// Check for duplicate payout methods: if multiple partners share the same payout method hash,
// create fraud events for all their active program enrollments to flag potential fraud
export async function detectDuplicatePayoutMethodFraud({
  payoutMethodHash,
  cryptoWalletAddress,
}: DetectDuplicatePayoutMethodFraudOptions) {
  if (!payoutMethodHash && !cryptoWalletAddress) {
    return;
  }

  let programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partner: {
        OR: [
          ...(payoutMethodHash ? [{ payoutMethodHash }] : []),
          ...(cryptoWalletAddress ? [{ cryptoWalletAddress }] : []),
        ],
      },
    },
    select: {
      programId: true,
      partnerId: true,
      status: true,
      riskMonitoringDisabledAt: true,
      program: {
        select: {
          fraudRules: true,
        },
      },
    },
  });

  if (programEnrollments.length === 0) {
    return;
  }

  // Filter out program enrollments where the partnerDuplicateAccount rule is disabled
  programEnrollments = programEnrollments.filter((enrollment) =>
    isFraudRuleEnabled({
      fraudRules: enrollment.program.fraudRules,
      ruleType: FraudRuleType.partnerDuplicateAccount,
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
      riskMonitoringDisabledAt: e.riskMonitoringDisabledAt,
    });

    return map;
  }, new Map<string, Pick<ProgramEnrollment, "partnerId" | "status" | "riskMonitoringDisabledAt">[]>());

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
      // Skip if the partner is inactive or risk detection is disabled
      if (
        INACTIVE_ENROLLMENT_STATUSES.includes(sourcePartner.status) ||
        sourcePartner.riskMonitoringDisabledAt
      ) {
        continue;
      }

      for (const enrolledPartner of partners) {
        fraudEvents.push({
          programId,
          partnerId: sourcePartner.partnerId,
          type: FraudRuleType.partnerDuplicateAccount,
          metadata: {
            ...(payoutMethodHash ? { payoutMethodHash } : {}),
            ...(cryptoWalletAddress ? { cryptoWalletAddress } : {}),
            duplicatePartnerId: enrolledPartner.partnerId,
          },
        });
      }
    }
  }

  const { affectedGroups } = await createFraudEvents(fraudEvents);

  const results = await Promise.allSettled([
    holdPendingCommissions(affectedGroups),
    holdProcessedCommissions(affectedGroups),
  ]);
  results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .forEach((r) => console.error("Failed to hold commissions:", r.reason));
}
