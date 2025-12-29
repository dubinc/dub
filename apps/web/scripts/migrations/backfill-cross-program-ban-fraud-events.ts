import { prisma } from "@dub/prisma";
import { groupBy } from "@dub/utils";
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

      await prisma.fraudEvent.update({
        where: {
          id: fraudEvent.id,
        },
        data: {
          sourceProgramId: sourceBan.programId,
          metadata: {
            bannedAt: sourceBan.bannedAt,
            bannedReason: sourceBan.bannedReason,
          },
        },
      });

      console.log(`Updated fraud event ${fraudEvent.id}.`);
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
