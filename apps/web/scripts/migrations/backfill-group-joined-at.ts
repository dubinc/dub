import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

//  Backfill ProgramEnrollment.groupJoinedAt for enrollments that have a groupId
//  but no groupJoinedAt yet.

//  Resolution order:
//  1. Latest partner.groupChanged activity log for that partner + program
//  2. Program application reviewedAt (approval/review time)
//  3. Enrollment createdAt
async function main() {
  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: {
          not: null,
        },
        groupJoinedAt: null,
      },
      select: {
        id: true,
        partnerId: true,
        programId: true,
        createdAt: true,
        application: {
          select: {
            reviewedAt: true,
          },
        },
      },
      take: 100,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (programEnrollments.length === 0) {
      console.log("No more program enrollments to backfill, skipping...");
      break;
    }

    const partnerIds = programEnrollments.map(({ partnerId }) => partnerId);
    const programIds = [
      ...new Set(programEnrollments.map(({ programId }) => programId)),
    ];

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        action: "partner.groupChanged",
        resourceType: "partner",
        resourceId: {
          in: partnerIds,
        },
        programId: {
          in: programIds,
        },
      },
      select: {
        programId: true,
        resourceId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const latestGroupChangeByEnrollment = new Map<string, Date>();

    for (const log of activityLogs) {
      const key = `${log.programId}:${log.resourceId}`;
      if (!latestGroupChangeByEnrollment.has(key)) {
        latestGroupChangeByEnrollment.set(key, log.createdAt);
      }
    }

    let fromActivity = 0;
    let fromReviewedAt = 0;
    let fromCreatedAt = 0;

    await Promise.all(
      programEnrollments.map((enrollment) => {
        const key = `${enrollment.programId}:${enrollment.partnerId}`;
        const latestGroupChange = latestGroupChangeByEnrollment.get(key);

        let groupJoinedAt: Date;

        if (latestGroupChange) {
          groupJoinedAt = latestGroupChange;
          fromActivity++;
        } else if (enrollment.application?.reviewedAt) {
          groupJoinedAt = enrollment.application.reviewedAt;
          fromReviewedAt++;
        } else {
          groupJoinedAt = enrollment.createdAt;
          fromCreatedAt++;
        }

        return prisma.programEnrollment.update({
          where: {
            id: enrollment.id,
          },
          data: {
            groupJoinedAt,
          },
        });
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      `Backfilled ${programEnrollments.length} enrollments (activity: ${fromActivity}, reviewedAt: ${fromReviewedAt}, createdAt: ${fromCreatedAt})...`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
