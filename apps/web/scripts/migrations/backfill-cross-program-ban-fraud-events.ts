import { createId } from "@/lib/api/create-id";
import { createFraudEventHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { chunk, groupBy } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const fraudGroups = await prisma.fraudEventGroup.findMany({
    where: {
      type: "partnerCrossProgramBan",
      fraudEvents: {
        some: {
          sourceProgramId: null,
        },
      },
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

  if (fraudGroups.length === 0) {
    console.log("No fraud events to process.");
    return;
  }

  console.log(`Found ${fraudGroups.length} fraud groups to process.`);

  const bannedEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: fraudGroups.map((e) => e.partnerId),
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

  const fraudEventsToCreate: Prisma.FraudEventCreateManyInput[] = [];

  for (const fraudGroup of fraudGroups) {
    const bannedEnrollments =
      bannedEnrollmentsByPartnerId[fraudGroup.partnerId];

    if (!bannedEnrollments || bannedEnrollments.length === 0) {
      continue;
    }

    for (const bannedEnrollment of bannedEnrollments) {
      if (bannedEnrollment.programId === fraudGroup.programId) {
        continue;
      }

      const fraudEvent = {
        programId: fraudGroup.programId,
        partnerId: fraudGroup.partnerId,
        sourceProgramId: bannedEnrollment.programId,
        metadata: {
          bannedAt: bannedEnrollment.bannedAt,
          bannedReason: bannedEnrollment.bannedReason,
        },
      };

      fraudEventsToCreate.push({
        ...fraudEvent,
        id: createId({ prefix: "fre_" }),
        fraudEventGroupId: fraudGroup.id,
        hash: createFraudEventHash({
          ...fraudEvent,
          type: FraudRuleType.partnerCrossProgramBan,
        }),
        createdAt: bannedEnrollment.bannedAt ?? new Date(),
        updatedAt: bannedEnrollment.bannedAt ?? new Date(),
      });
    }
  }

  if (fraudEventsToCreate.length > 0) {
    const chunks = chunk(fraudEventsToCreate, 500);

    for (const chunk of chunks) {
      await prisma.fraudEvent.createMany({
        data: chunk,
      });
    }

    console.log(`Created ${fraudEventsToCreate.length} fraud events total.`);
  }

  // Delete old fraud events without sourceProgramId
  // These are the old fraud events that we're replacing with new ones that have sourceProgramId
  const deletedFraudEvent = await prisma.fraudEvent.deleteMany({
    where: {
      fraudEventGroup: {
        type: "partnerCrossProgramBan",
      },
      sourceProgramId: null,
    },
  });

  console.log(`Deleted ${deletedFraudEvent.count} old fraud events.`);

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
