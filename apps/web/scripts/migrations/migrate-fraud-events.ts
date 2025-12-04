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
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    groupsToCreate.push({
      id: groupId,
      programId: firstEvent.programId,
      partnerId: firstEvent.partnerId,
      type: firstEvent.type,
      lastEventAt: lastEvent.createdAt,
      eventCount: events.length,
      userId: firstEvent.userId,
      resolutionReason: firstEvent.resolutionReason,
      resolvedAt: firstEvent.resolvedAt,
      status: firstEvent.status,
      createdAt: firstEvent.createdAt,
      updatedAt: lastEvent.createdAt,
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
