import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

/**
 * Cleanup script for duplicate payout method fraud events.
 * Removes fraud events of type "partnerDuplicatePayoutMethod" where:
 * 1. There's only one partner in the group, OR
 * 2. All events in the group have the same partnerId (no actual cross-partner duplicate)
 */

// Case 1: Remove fraud events where there's only one event in the group
async function cleanupSingleEventGroups() {
  const fraudGroups = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    where: {
      type: "partnerDuplicatePayoutMethod",
    },
    _count: true,
  });

  const fraudGroupWithOnePartner = fraudGroups.filter(
    (group) => group._count === 1,
  );

  console.log(
    `Found ${fraudGroupWithOnePartner.length} fraud groups with one event.`,
  );

  if (fraudGroupWithOnePartner.length === 0) {
    return 0;
  }

  const chunks = chunk(fraudGroupWithOnePartner, 100);

  for (const batch of chunks) {
    await prisma.fraudEvent.deleteMany({
      where: {
        groupKey: {
          in: batch.map(({ groupKey }) => groupKey),
        },
      },
    });
  }
}

// Case 2: Remove fraud events where all events in the group have the same partnerId
async function cleanupSamePartnerGroups() {
  const fraudGroups = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    where: {
      type: "partnerDuplicatePayoutMethod",
    },
    _count: true,
  });

  const groupsWithMultipleEvents = fraudGroups.filter(
    (group) => group._count >= 2,
  );

  console.log(
    `Checking ${groupsWithMultipleEvents.length} groups with multiple events...`,
  );

  const fraudGroupsWithSamePartner: {
    groupKey: string;
    partnerId: string;
    count: number;
  }[] = [];

  for (const group of groupsWithMultipleEvents) {
    const events = await prisma.fraudEvent.findMany({
      where: {
        groupKey: group.groupKey,
        type: "partnerDuplicatePayoutMethod",
      },
      select: {
        partnerId: true,
      },
    });

    // Check if all partnerIds are the same
    const uniquePartnerIds = new Set(events.map((e) => e.partnerId));

    if (uniquePartnerIds.size === 1) {
      fraudGroupsWithSamePartner.push({
        groupKey: group.groupKey,
        partnerId: events[0].partnerId,
        count: events.length,
      });
    }
  }

  console.log(
    `Found ${fraudGroupsWithSamePartner.length} fraud groups where all events have the same partnerId.`,
  );

  if (fraudGroupsWithSamePartner.length === 0) {
    return 0;
  }

  console.table(fraudGroupsWithSamePartner);

  const chunks = chunk(fraudGroupsWithSamePartner, 100);

  for (const batch of chunks) {
    await prisma.fraudEvent.deleteMany({
      where: {
        groupKey: {
          in: batch.map(({ groupKey }) => groupKey),
        },
      },
    });
  }
}

async function main() {
  // Run one at a time
  await cleanupSingleEventGroups();
  // await cleanupSamePartnerGroups();
}

main();
