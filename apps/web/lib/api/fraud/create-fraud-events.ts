import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { createId } from "../create-id";
import {
  createFraudEventFingerprint,
  createFraudEventGroupKey,
  createFraudGroupHash,
} from "./utils";

export async function createFraudEvents(fraudEvents: CreateFraudEventInput[]) {
  if (fraudEvents.length === 0) {
    return {
      createdEvents: 0,
      createdGroups: 0,
    };
  }

  // 1. Compute fingerprint + groupHash once
  const eventsWithComputed = fraudEvents.map((e) => ({
    ...e,
    fingerprint: createFraudEventFingerprint(e),
    groupHash: createFraudGroupHash(e),
  }));

  // Unique fingerprints & group hashes
  const uniqueFingerprints = Array.from(
    new Set(eventsWithComputed.map((e) => e.fingerprint)),
  );

  const uniqueGroupHashes = Array.from(
    new Set(eventsWithComputed.map((e) => e.groupHash)),
  );

  return await prisma.$transaction(async (tx) => {
    // 2. Fetch existing pending events with same fingerprint
    const existingEvents = await tx.fraudEvent.findMany({
      where: {
        fingerprint: { in: uniqueFingerprints },
        fraudEventGroup: { status: "pending" },
      },
      select: {
        fingerprint: true,
      },
    });

    const existingFingerprintSet = new Set(
      existingEvents.map((e) => e.fingerprint),
    );

    // 3. Filter out events that already exist
    const filteredEvents = eventsWithComputed.filter(
      (e) => !existingFingerprintSet.has(e.fingerprint),
    );

    if (filteredEvents.length === 0) {
      return {
        createdEvents: 0,
        createdGroups: 0,
      };
    }

    // 4. Fetch existing pending groups
    const existingGroups = await tx.fraudEventGroup.findMany({
      where: {
        hash: { in: uniqueGroupHashes },
        status: "pending",
      },
    });

    const groupMap = new Map(existingGroups.map((g) => [g.hash, g.id]));

    // 5. Create missing groups bulk
    const groupsToCreate = uniqueGroupHashes
      .filter((hash) => !groupMap.has(hash))
      .map((hash) => {
        const anyEvent = filteredEvents.find((e) => e.groupHash === hash)!;
        const id = createId({ prefix: "frg_" });
        groupMap.set(hash, id);

        return {
          id,
          programId: anyEvent.programId,
          partnerId: anyEvent.partnerId,
          type: anyEvent.type,
          hash,
        };
      });

    if (groupsToCreate.length > 0) {
      await tx.fraudEventGroup.createMany({
        data: groupsToCreate,
      });
    }

    // 4) Bulk insert FraudEvents
    const eventsToInsert: Prisma.FraudEventCreateManyInput[] =
      filteredEvents.map((e) => ({
        id: createId({ prefix: "fre_" }),
        fraudEventGroupId: groupMap.get(e.groupHash)!,
        eventId: e.eventId,
        linkId: e.linkId,
        customerId: e.customerId,
        metadata: e.metadata as Prisma.InputJsonValue,
        fingerprint: e.fingerprint,
        ...(e.type === FraudRuleType.partnerDuplicatePayoutMethod && {
          partnerId: (e.metadata as Record<string, string>)?.duplicatePartnerId,
        }),

        // DEPRECATED FIELDS: TODO – remove after migration
        programId: e.programId,
        type: e.type,
        groupKey: createFraudEventGroupKey({
          programId: e.programId,
          type: e.type,
          groupingKey: e.partnerId,
        }),
      }));

    await tx.fraudEvent.createMany({
      data: eventsToInsert,
    });

    // 5) Bulk update eventCount + lastEventAt
    const countsPerGroup = filteredEvents.reduce((map, e) => {
      const id = groupMap.get(e.groupHash)!;
      map.set(id, (map.get(id) || 0) + 1);
      return map;
    }, new Map<string, number>());

    const now = new Date();

    await Promise.all(
      Array.from(countsPerGroup.entries()).map(([id, count]) =>
        tx.fraudEventGroup.update({
          where: {
            id,
          },
          data: {
            eventCount: { increment: count },
            lastEventAt: now,
          },
        }),
      ),
    );

    return {
      createdGroups: groupsToCreate.length,
      createdEvents: eventsToInsert.length,
    };
  });
}
