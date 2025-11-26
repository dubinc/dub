import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Find all pending fraud events
  const pendingEvents = await prisma.fraudEvent.findMany({
    where: {
      status: "pending",
      customerId: {
        not: null,
      },
      commissionId: null,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`Found ${pendingEvents.length} pending fraud events.`);

  if (pendingEvents.length === 0) {
    console.log("No pending events to process.");
    return;
  }

  // Group events by the deduplication key: programId + partnerId + customerId + type
  const eventGroups = new Map<string, Array<{ id: string; createdAt: Date }>>();

  for (const event of pendingEvents) {
    const key = [
      event.programId,
      event.partnerId,
      event.customerId,
      event.type,
    ].join("|");

    if (!eventGroups.has(key)) {
      eventGroups.set(key, []);
    }

    eventGroups.get(key)!.push({
      id: event.id,
      createdAt: event.createdAt,
    });
  }

  // Find groups with duplicates (more than 1 event)
  const duplicateGroups = Array.from(eventGroups.entries()).filter(
    ([, events]) => events.length > 1,
  );

  console.log(`Found ${duplicateGroups.length} duplicate groups.`);

  if (duplicateGroups.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  // Collect IDs to delete (keep the oldest event in each group)
  const idsToDelete: string[] = [];
  let totalDuplicates = 0;

  for (const [, events] of duplicateGroups) {
    // Sort by createdAt to ensure we keep the oldest
    const sortedEvents = [...events].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // Keep the first (oldest) event, delete the rest
    const toDelete = sortedEvents.slice(1);
    idsToDelete.push(...toDelete.map((e) => e.id));
    totalDuplicates += toDelete.length;

    console.log(
      `Group has ${events.length} events, keeping oldest (${sortedEvents[0].id}), deleting ${toDelete.length} duplicates.`,
    );
  }

  console.log(`Total ${totalDuplicates} duplicates to delete.`);

  if (idsToDelete.length === 0) {
    console.log("No events to delete.");
    return;
  }

  const deletedEvents = await prisma.fraudEvent.deleteMany({
    where: {
      id: {
        in: idsToDelete,
      },
    },
  });

  console.log(`Deleted ${deletedEvents.count} duplicate fraud events.`);
}

main();
