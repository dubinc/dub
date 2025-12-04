import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";

/**
 * Migrate partnerDuplicatePayoutMethod fraud events to the new FraudEventGroup structure.
 *
 * These events require special handling because a single groupKey (payout method hash)
 * can contain events from multiple partners who share the same payout method.
 *
 * Migration strategy:
 * 1. For each groupKey, identify all unique partners
 * 2. Create a separate FraudEventGroup for each partner
 * 3. For the first partner, update existing events in place
 * 4. For additional partners, duplicate the events and link to their respective groups
 */
async function main() {
  const duplicatePayoutGroups = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    where: {
      fraudEventGroupId: null,
      type: "partnerDuplicatePayoutMethod",
    },
    _count: true,
  });

  console.log(
    `Migrating ${duplicatePayoutGroups.length} partnerDuplicatePayoutMethod fraud event groups...`,
  );

  for (const fraudGroup of duplicatePayoutGroups) {
    console.log(`Migrating fraud group ${fraudGroup.groupKey}...`);

    // Get all fraud events for this groupKey (payout method hash)
    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        groupKey: fraudGroup.groupKey,
        fraudEventGroupId: null,
        type: "partnerDuplicatePayoutMethod",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (fraudEvents.length === 0) {
      continue;
    }

    // Extract unique partner IDs that share this payout method
    const uniquePartnerIds = Array.from(
      new Set(fraudEvents.map((e) => e.partnerId)),
    ).filter((id): id is string => id !== null);

    // Create a FraudEventGroup for each unique partner
    const fraudEventGroups: Prisma.FraudEventGroupCreateManyInput[] = [];

    for (const partnerId of uniquePartnerIds) {
      const firstFraudEvent = fraudEvents[0];
      const lastFraudEvent = fraudEvents[fraudEvents.length - 1];

      fraudEventGroups.push({
        id: createId({ prefix: "frg_" }),
        programId: firstFraudEvent.programId,
        partnerId: partnerId,
        type: "partnerDuplicatePayoutMethod",
        lastEventAt: lastFraudEvent.createdAt,
        eventCount: fraudEvents.length,
        userId: firstFraudEvent.userId,
        resolutionReason: firstFraudEvent.resolutionReason,
        resolvedAt: firstFraudEvent.resolvedAt,
        status: firstFraudEvent.status,
        createdAt: firstFraudEvent.createdAt,
        updatedAt: lastFraudEvent.createdAt,
      });
    }

    await prisma.fraudEventGroup.createMany({
      data: fraudEventGroups,
    });

    // Link fraud events to their respective FraudEventGroups
    for (const partnerId of uniquePartnerIds) {
      if (partnerId === uniquePartnerIds[0]) {
        // For the first partner, update existing events in place to link them to the new group
        await prisma.fraudEvent.updateMany({
          where: {
            groupKey: fraudGroup.groupKey,
            fraudEventGroupId: null,
            type: "partnerDuplicatePayoutMethod",
          },
          data: {
            fraudEventGroupId: fraudEventGroups.find(
              (group) => group.partnerId === partnerId,
            )?.id,
          },
        });

        continue;
      }

      // For additional partners, duplicate the events and link to their respective groups
      // This is necessary because the old model had all partners' events under one groupKey,
      // but the new model requires separate FraudEventGroups per partner
      await prisma.fraudEvent.createMany({
        data: fraudEvents.map((event) => ({
          ...event,
          id: createId({ prefix: "fre_" }),
          metadata: event.metadata ?? undefined,
          fraudEventGroupId: fraudEventGroups.find(
            (group) => group.partnerId === partnerId,
          )?.id,
        })),
      });
    }
  }

  console.log("partnerDuplicatePayoutMethod migration completed.");
}

main();
