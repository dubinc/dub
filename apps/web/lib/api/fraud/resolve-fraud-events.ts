import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { createFraudEventGroupKey } from "./utils";

export async function resolveFraudEvents({
  where,
  userId,
  resolutionReason,
}: {
  where: Prisma.FraudEventWhereInput;
  userId: string;
  resolutionReason?: string;
}) {
  // Fetch pending fraud events matching the where clause
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      ...where,
      status: "pending",
    },
    select: {
      id: true,
      groupKey: true,
      partnerId: true,
      type: true,
      programId: true,
    },
  });

  if (fraudEvents.length === 0) {
    return;
  }

  // Group events by their existing groupKey
  const groupedEvents = fraudEvents.reduce((acc, event) => {
    if (!acc.has(event.groupKey)) {
      acc.set(event.groupKey, []);
    }

    acc.get(event.groupKey)!.push(event);

    return acc;
  }, new Map<string, typeof fraudEvents>());

  // Update each group with a new groupKey and mark as resolved
  for (const [groupKey, events] of groupedEvents) {
    if (events.length === 0) continue;

    const firstEvent = events[0];
    const newGroupKey = createFraudEventGroupKey({
      programId: firstEvent.programId,
      partnerId: firstEvent.partnerId,
      type: firstEvent.type,
      batchId: nanoid(10),
    });

    await prisma.fraudEvent.updateMany({
      where: {
        groupKey,
        status: "pending",
      },
      data: {
        status: "resolved",
        userId,
        resolvedAt: new Date(),
        resolutionReason,
        groupKey: newGroupKey,
      },
    });
  }

  return fraudEvents;
}
