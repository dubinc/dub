import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const payoutMethodHash = "1";

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

  if (duplicatePartners.length > 1) {
    const fraudEvents: CreateFraudEventInput[] = [];

    const partnersByProgram = new Map<string, string[]>();

    // Map program → partner list
    for (const partner of duplicatePartners) {
      for (const { programId } of partner.programs) {
        const list = partnersByProgram.get(programId) ?? [];
        list.push(partner.id);
        partnersByProgram.set(programId, list);
      }
    }

    for (const partner of duplicatePartners) {
      for (const { programId } of partner.programs) {
        const enrolledPartners = partnersByProgram.get(programId) ?? [];

        // Always create self event
        fraudEvents.push({
          programId,
          partnerId: partner.id,
          type: FraudRuleType.partnerDuplicatePayoutMethod,
          metadata: {
            payoutMethodHash,
            duplicatePartnerId: partner.id,
          },
        });

        // Create events for other partners in THIS program
        for (const duplicatePartnerId of enrolledPartners) {
          if (duplicatePartnerId === partner.id) continue;

          fraudEvents.push({
            programId,
            partnerId: partner.id,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
            metadata: {
              payoutMethodHash,
              duplicatePartnerId,
            },
          });
        }
      }
    }

    await createFraudEvents(fraudEvents);
  }
}

main();
