import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Step 1: Find and delete fraud groups without any events
  console.log("Finding fraud groups without events...");

  const fraudGroupsWithoutEvents = await prisma.fraudEventGroup.findMany({
    where: {
      fraudEvents: {
        none: {},
      },
    },
    select: {
      id: true,
    },
  });

  console.log(
    `Found ${fraudGroupsWithoutEvents.length} fraud groups without events.`,
  );

  console.table(fraudGroupsWithoutEvents);

  if (fraudGroupsWithoutEvents.length > 0) {
    const deleteResult = await prisma.fraudEventGroup.deleteMany({
      where: {
        id: {
          in: fraudGroupsWithoutEvents.map((g) => g.id),
        },
      },
    });
    console.log(`Deleted ${deleteResult.count} fraud groups without events.`);
  }

  // Sync event counts for all remaining fraud groups

  const allFraudGroups = await prisma.fraudEventGroup.findMany({
    select: {
      id: true,
      eventCount: true,
      _count: {
        select: {
          fraudEvents: true,
        },
      },
    },
  });

  console.log(`Found ${allFraudGroups.length} total fraud groups.`);

  // Find groups where the count doesn't match
  const groupsToUpdate = allFraudGroups.filter(
    (g) => g.eventCount !== g._count.fraudEvents,
  );

  console.log(
    `Found ${groupsToUpdate.length} fraud groups with mismatched event counts.`,
  );

  console.table(groupsToUpdate);

  if (groupsToUpdate.length > 0) {
    for (const group of groupsToUpdate) {
      await prisma.fraudEventGroup.update({
        where: { id: group.id },
        data: { eventCount: group._count.fraudEvents },
      });
    }
  }
}

main();
