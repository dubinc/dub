import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { FraudEvent, Prisma } from "@dub/prisma/client";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroupId: null,
      type: {
        not: "partnerDuplicatePayoutMethod",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (fraudEvents.length === 0) {
    console.log("No fraud events to migrate.");
    return;
  }

  console.log(`Found ${fraudEvents.length} fraud events to migrate.`);

  const fraudEventsByGroupKey = fraudEvents.reduce(
    (acc, event) => {
      acc[event.groupKey] = acc[event.groupKey] || [];
      acc[event.groupKey].push(event);
      return acc;
    },
    {} as Record<string, FraudEvent[]>,
  );

  const groupsToCreate: Prisma.FraudEventGroupCreateManyInput[] = [];
  const groupKeyToGroupId = new Map<string, string>();

  for (const [groupKey, events] of Object.entries(fraudEventsByGroupKey)) {
    const groupId = createId({ prefix: "frg_" });
    const latestEvent = events[0]; // Newest (desc order)
    const earliestEvent = events[events.length - 1]; // Oldest

    groupsToCreate.push({
      id: groupId,
      programId: latestEvent.programId,
      partnerId: latestEvent.partnerId,
      type: latestEvent.type,
      lastEventAt: latestEvent.createdAt,
      eventCount: events.length,
      userId: latestEvent.userId,
      resolutionReason: latestEvent.resolutionReason,
      resolvedAt: latestEvent.resolvedAt,
      status: latestEvent.status,
      createdAt: earliestEvent.createdAt,
      updatedAt: latestEvent.createdAt,
    });

    groupKeyToGroupId.set(groupKey, groupId);
  }

  await prisma.fraudEventGroup.createMany({
    data: groupsToCreate,
  });

  const chunks = chunk(Array.from(groupKeyToGroupId.entries()), 100);

  for (const batch of chunks) {
    await Promise.all(
      batch.map(([groupKey, groupId]) =>
        prisma.fraudEvent.updateMany({
          where: {
            groupKey,
          },
          data: {
            fraudEventGroupId: groupId,
          },
        }),
      ),
    );
  }
}

main();
