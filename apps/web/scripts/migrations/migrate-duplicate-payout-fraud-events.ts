import { createId } from "@/lib/api/create-id";
import { createFraudGroupHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Migrate partnerDuplicatePayoutMethod events
// These require special handling because one groupKey can contain events from multiple partners
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

    // Extract unique partner IDs from the fraud events
    const uniquePartnerIds = Array.from(
      new Set(fraudEvents.map((e) => e.partnerId)),
    ).filter((id): id is string => id !== null);

    // two case
    // uniquePartnerIds -> eq 1
    // uniquePartnerIds > gt 1

    // Create a separate group for each partner and duplicate all events
    for (const partnerId of uniquePartnerIds) {
      const firstFraudEvent = fraudEvents[0];
      const lastFraudEvent = fraudEvents[fraudEvents.length - 1];

      // Create fraud event group for this partner
      const fraudEventGroup = await prisma.fraudEventGroup.create({
        data: {
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
          hash: createFraudGroupHash({
            programId: firstFraudEvent.programId,
            partnerId: partnerId,
            type: "partnerDuplicatePayoutMethod",
          }),
        },
      });

      // if there is only one partner, we don't need to duplicate the events
      // Instead, we will link the events to the fraud event group
      if (uniquePartnerIds.length === 1) {
        await prisma.fraudEvent.updateMany({
          where: {
            groupKey: fraudGroup.groupKey,
            fraudEventGroupId: null,
            type: "partnerDuplicatePayoutMethod",
          },
          data: {
            fraudEventGroupId: fraudEventGroup.id,
          },
        });

        console.log(
          `Linked ${fraudEvents.length} events to group ${fraudEventGroup.id} for partner ${partnerId}`,
        );

        continue;
      }

      // if there are multiple partners, we need to duplicate the events for each partner
      await prisma.fraudEvent.createMany({
        data: fraudEvents.map((event) => ({
          id: createId({ prefix: "fre_" }),
          fraudEventGroupId: fraudEventGroup.id,
          partnerId: event.partnerId,
          linkId: event.linkId,
          customerId: event.customerId,
          eventId: event.eventId,
          fingerprint: event.fingerprint,
          metadata: event.metadata ?? undefined,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,

          // Deprecated fields (TODO: remove after migration)
          programId: event.programId,
          commissionId: event.commissionId,
          type: event.type,
          groupKey: event.groupKey,
          userId: event.userId,
          resolutionReason: event.resolutionReason,
          resolvedAt: event.resolvedAt,
          status: event.status,
        })),
      });

      console.log(
        `Created group ${fraudEventGroup.id} for partner ${partnerId} with ${fraudEvents.length} duplicated events`,
      );
    }
  }

  console.log("partnerDuplicatePayoutMethod migration completed.");
}

main();
