import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";
import { createFraudEvents } from "./create-fraud-events";

// Check for duplicate payout methods: if multiple partners share the same payout method hash,
// create fraud events for all their active program enrollments to flag potential fraud
export async function detectDuplicatePayoutMethodFraud(
  payoutMethodHash: string,
) {
  if (!payoutMethodHash) return;

  // 1. Find all partners using this payout method
  const duplicatePartners = await prisma.partner.findMany({
    where: {
      payoutMethodHash,
    },
    select: {
      id: true,
      programs: {
        where: {
          status: {
            notIn: ["banned", "deactivated", "rejected"],
          },
        },
        select: {
          partnerId: true,
          programId: true,
        },
      },
    },
  });

  console.info(
    `Found ${duplicatePartners.length} partners with same payout method hash ${prettyPrint(duplicatePartners)}`,
  );

  if (duplicatePartners.length <= 1) return;

  // 2. Map programId (all partnerIds in the same program)
  const partnersByProgram = new Map<string, string[]>();

  for (const partner of duplicatePartners) {
    for (const { programId } of partner.programs) {
      const list = partnersByProgram.get(programId) ?? [];
      list.push(partner.id);
      partnersByProgram.set(programId, list);
    }
  }

  // 3. Generate fraud events (self + cross-partner within same program)
  const fraudEvents: CreateFraudEventInput[] = [];

  for (const partner of duplicatePartners) {
    for (const { programId } of partner.programs) {
      const enrolledPartners = partnersByProgram.get(programId) ?? [];

      // Self event
      fraudEvents.push({
        programId,
        partnerId: partner.id,
        type: FraudRuleType.partnerDuplicatePayoutMethod,
        metadata: {
          payoutMethodHash,
          duplicatePartnerId: partner.id,
        },
      });

      // Other-partner events
      for (const dupPartnerId of enrolledPartners) {
        if (dupPartnerId === partner.id) continue;

        fraudEvents.push({
          programId,
          partnerId: partner.id,
          type: FraudRuleType.partnerDuplicatePayoutMethod,
          metadata: {
            payoutMethodHash,
            duplicatePartnerId: dupPartnerId,
          },
        });
      }
    }
  }

  await createFraudEvents(fraudEvents);
}
