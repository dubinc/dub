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
  if (!payoutMethodHash) {
    return {
      isPayoutMethodDuplicate: false,
      duplicatePartners: [],
    };
  }

  //  Find all partners using this payout method with their program enrollments
  const duplicatePartners = await prisma.partner.findMany({
    where: {
      payoutMethodHash,
    },
    select: {
      id: true,
      email: true,
      stripeConnectId: true,
      programs: {
        select: {
          programId: true,
        },
      },
    },
  });

  if (duplicatePartners.length <= 1) {
    return {
      isPayoutMethodDuplicate: false,
      duplicatePartners: [],
    };
  }

  console.info(
    `Found ${duplicatePartners.length} partners with same payout method hash ${prettyPrint(duplicatePartners)}`,
  );

  //  Group program enrollments by programId
  const partnersByProgram = new Map<string, string[]>();

  for (const partner of duplicatePartners) {
    for (const { programId } of partner.programs) {
      const list = partnersByProgram.get(programId) ?? [];
      list.push(partner.id);
      partnersByProgram.set(programId, list);
    }
  }

  // Generate fraud events (only when both accounts are enrolled in the same program)
  const fraudEvents: CreateFraudEventInput[] = [];

  for (const partner of duplicatePartners) {
    for (const { programId } of partner.programs) {
      const enrolledPartners = partnersByProgram.get(programId) ?? [];

      // Only create events if there are multiple partners with same payout method in this program
      if (enrolledPartners.length <= 1) continue;

      // Create events for each enrolled partner (including self)
      for (const enrolledPartner of enrolledPartners) {
        fraudEvents.push({
          programId,
          partnerId: partner.id,
          type: FraudRuleType.partnerDuplicatePayoutMethod,
          metadata: {
            payoutMethodHash,
            duplicatePartnerId: enrolledPartner,
          },
        });
      }
    }
  }

  await createFraudEvents(fraudEvents);

  return {
    isPayoutMethodDuplicate: true,
    duplicatePartners: duplicatePartners.map(({ id, email }) => ({
      id,
      email,
    })),
  };
}
