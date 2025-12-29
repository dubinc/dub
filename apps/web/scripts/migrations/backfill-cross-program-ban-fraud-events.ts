import { prisma } from "@dub/prisma";
import { chunk, groupBy } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroup: {
        type: "partnerCrossProgramBan",
      },
      sourceProgramId: null, // Only process unprocessed records
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (fraudEvents.length === 0) {
    console.log("No fraud events to process.");
    return;
  }

  console.log(`Found ${fraudEvents.length} fraud events to process.`);

  const bannedEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: fraudEvents.map((e) => e.partnerId),
      },
      status: "banned",
    },
    select: {
      programId: true,
      partnerId: true,
      bannedAt: true,
      bannedReason: true,
    },
    orderBy: {
      bannedAt: "asc",
    },
  });

  const bannedEnrollmentsByPartnerId = groupBy(
    bannedEnrollments,
    (e) => e.partnerId,
  );

  const fraudEventsByPartnerId = groupBy(fraudEvents, (e) => e.partnerId);

  const toDelete = new Set<string>();
  const toUpdate: {
    id: string;
    sourceProgramId: string;
    metadata: { bannedAt: Date | null; bannedReason: string | null };
  }[] = [];

  for (const [partnerId, partnerFraudEvents] of Object.entries(
    fraudEventsByPartnerId,
  )) {
    const bannedEnrollments = bannedEnrollmentsByPartnerId[partnerId];

    // No banned enrollments found for this partner
    if (!bannedEnrollments) {
      partnerFraudEvents.forEach((e) => toDelete.add(e.id));
      continue;
    }

    for (const fraudEvent of partnerFraudEvents) {
      const sourceBan = bannedEnrollments.find(
        (e) => e.programId !== fraudEvent.programId,
      );

      if (!sourceBan) {
        toDelete.add(fraudEvent.id);
        continue;
      }

      toUpdate.push({
        id: fraudEvent.id,
        sourceProgramId: sourceBan.programId,
        metadata: {
          bannedAt: sourceBan.bannedAt,
          bannedReason: sourceBan.bannedReason,
        },
      });
    }
  }

  console.table(toUpdate);

  if (toUpdate.length > 0) {
    const chunks = chunk(toUpdate, 100);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((e) =>
          prisma.fraudEvent.update({
            where: {
              id: e.id,
            },
            data: {
              sourceProgramId: e.sourceProgramId,
              metadata: e.metadata,
            },
          }),
        ),
      );

      console.log(`Updated ${chunk.length} fraud events...`);
    }
  }

  // Delete fraud events that were not matched to a program enrollment (means the partner might have been unbanned)
  if (toDelete.size > 0) {
    const deletedFraudEvents = await prisma.fraudEvent.deleteMany({
      where: {
        id: {
          in: Array.from(toDelete),
        },
      },
    });

    console.log(`Deleted ${deletedFraudEvents.count} fraud events.`);
  }

  // Delete fraud event groups that have no fraud events
  const deletedFraudEventGroups = await prisma.fraudEventGroup.deleteMany({
    where: {
      type: "partnerCrossProgramBan",
      fraudEvents: {
        none: {},
      },
    },
  });

  console.log(`Deleted ${deletedFraudEventGroups.count} fraud event groups.`);
}

main();
