import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Case 1: Remove fraud events where there's only one event in the group
async function cleanupSingleEventGroups() {
  const fraudGroups = await prisma.fraudEventGroup.findMany({
    where: {
      type: "partnerDuplicatePayoutMethod",
      eventCount: 1,
    },
    select: {
      id: true,
      eventCount: true,
      createdAt: true,
    },
  });

  console.log(
    `Found ${fraudGroups.length} fraud groups with one event for partnerDuplicatePayoutMethod.`,
  );

  console.table(fraudGroups);

  if (fraudGroups.length === 0) {
    return;
  }

  const groupIds = fraudGroups.map(({ id }) => id);

  await prisma.$transaction(async (tx) => {
    // Delete the raw events
    const deletedEvents = await tx.fraudEvent.deleteMany({
      where: {
        fraudEventGroupId: {
          in: groupIds,
        },
      },
    });

    // Delete the group
    const deletedGroups = await tx.fraudEventGroup.deleteMany({
      where: {
        id: {
          in: groupIds,
        },
      },
    });

    console.log(`Deleted ${deletedEvents.count} fraud events`);
    console.log(`Deleted ${deletedGroups.count} fraud event groups`);
  });
}

async function main() {
  await cleanupSingleEventGroups();
}

main();
