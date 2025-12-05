import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { createId } from "../create-id";
import {
  createFraudEventGroupKey,
  createFraudEventHash,
  createGroupCompositeKey,
  getPartnerIdForFraudEvent,
} from "./utils";

export async function createFraudEvents(fraudEvents: CreateFraudEventInput[]) {
  if (fraudEvents.length === 0) {
    return;
  }

  const eventsWithHash = fraudEvents.map((e) => ({
    ...e,
    hash: createFraudEventHash(e),
  }));

  // Deduplicate by hash in-memory first
  const uniqueEvents = Array.from(
    new Map(eventsWithHash.map((e) => [e.hash, e])).values(),
  );

  // Find existing groups to avoid creating duplicates and maintain group continuity
  // Events with the same programId/partnerId/type should be grouped together
  const existingGroups = await prisma.fraudEventGroup.findMany({
    where: {
      OR: uniqueEvents.map((e) => ({
        programId: e.programId,
        partnerId: e.partnerId,
        type: e.type,
        status: "pending",
      })),
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
      type: true,
    },
  });

  // Identify events that need new groups created because they represent
  const groupsToCreate = uniqueEvents.filter(
    (e) =>
      !existingGroups.some(
        (g) =>
          g.programId === e.programId &&
          g.partnerId === e.partnerId &&
          g.type === e.type,
      ),
  );

  // Deduplicate groups to create since multiple events may require the same group
  const newGroups = Array.from(
    new Map(
      groupsToCreate.map((e) => [`${e.programId}:${e.partnerId}:${e.type}`, e]),
    ).values(),
  ).map((e) => ({
    id: createId({ prefix: "frg_" }),
    programId: e.programId,
    partnerId: e.partnerId,
    type: e.type,
  }));

  // Create new groups
  if (newGroups.length > 0) {
    await prisma.fraudEventGroup.createMany({
      data: newGroups,
    });
  }

  // Final list of groups to use
  const finalGroups = [...existingGroups, ...newGroups];

  const finalGroupLookup = new Map(
    finalGroups.map((g) => [createGroupCompositeKey(g), g.id]),
  );

  // Fetch existing events to prevent duplicate fraud event records
  // A fraud event with the same hash in a pending group is considered a duplicate
  const existingEvents = await prisma.fraudEvent.findMany({
    where: {
      hash: {
        in: uniqueEvents.map((e) => e.hash),
      },
      fraudEventGroup: {
        status: "pending",
      },
    },
    select: {
      id: true,
      fraudEventGroupId: true,
      hash: true,
    },
  });

  // Deduplicate events by hash
  const newEvents = uniqueEvents.filter(
    (e) =>
      !existingEvents.some((existingEvent) => existingEvent.hash === e.hash),
  );

  const newEventsWithGroup: Prisma.FraudEventCreateManyInput[] = newEvents.map(
    (e) => ({
      id: createId({ prefix: "fre_" }),
      programId: e.programId,
      fraudEventGroupId: finalGroupLookup.get(createGroupCompositeKey(e)),
      partnerId: getPartnerIdForFraudEvent(e),
      linkId: e.linkId,
      customerId: e.customerId,
      eventId: e.eventId,
      hash: e.hash,
      metadata: e.metadata ?? undefined,

      // DEPRECATED FIELDS: TODO – remove after migration
      type: e.type,
      groupKey: createFraudEventGroupKey({
        programId: e.programId,
        type: e.type,
        groupingKey: e.partnerId,
      }),
    }),
  );

  if (newEventsWithGroup.length === 0) {
    return;
  }

  await prisma.fraudEvent.createMany({
    data: newEventsWithGroup,
  });

  await Promise.allSettled(
    finalGroups.map((group) =>
      prisma.fraudEventGroup.update({
        where: {
          id: group.id,
        },
        data: {
          lastEventAt: new Date(),
          eventCount: {
            increment: newEventsWithGroup.filter(
              (e) => e.fraudEventGroupId === group.id,
            ).length,
          },
        },
      }),
    ),
  );
}
