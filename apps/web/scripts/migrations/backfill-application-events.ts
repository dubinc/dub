import { createId } from "@/lib/api/create-id";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { randomInt } from "crypto";
import { addSeconds, differenceInSeconds, subSeconds } from "date-fns";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const programApplications = await prisma.programApplication.findMany({
      where: {
        programApplicationEvents: {
          none: {},
        },
      },
      include: {
        enrollment: {
          include: {
            partner: true,
            links: {
              orderBy: {
                createdAt: "asc",
              },
              take: 1,
            },
          },
        },
      },
      take: 250,
    });

    if (programApplications.length === 0) {
      console.log("No program applications found, skipping...");
      break;
    }

    const programApplicationEvents: Prisma.ProgramApplicationEventCreateManyInput[] =
      programApplications.map((programApplication) => {
        const { programId, enrollment } = programApplication;

        // for applications created after 2025-12-09 (program marketplace launch),
        // if the enrollment was created within 5 seconds of the application, it's a marketplace referral
        const referralSource =
          enrollment &&
          programApplication.createdAt > new Date("2025-12-09") &&
          differenceInSeconds(
            enrollment.createdAt,
            programApplication.createdAt,
          ) < 5
            ? "marketplace"
            : "direct";

        // average time from view -> submission is 5-10 mins so let's do 5 min + random seconds between 0-300
        const visitedAt = subSeconds(
          programApplication.createdAt,
          300 + randomInt(0, 300),
        );
        // assume starts application after 15-45 seconds
        const startedAt = addSeconds(visitedAt, randomInt(15, 45));

        const reviewedAt =
          programApplication.reviewedAt ??
          enrollment?.links?.[0]?.createdAt ??
          programApplication.updatedAt;

        return {
          id: createId({ prefix: "pga_evt_" }),
          programId: programId,
          country: programApplication.country ?? enrollment?.partner?.country,
          referralSource,
          programApplicationId: programApplication.id,
          partnerId: enrollment?.partnerId,
          visitedAt,
          startedAt,
          submittedAt: programApplication.createdAt,
          ...(enrollment
            ? ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status)
              ? {
                  approvedAt: reviewedAt,
                }
              : enrollment.status === "rejected"
                ? {
                    rejectedAt: reviewedAt,
                  }
                : {}
            : {}),
        };
      });

    // console.table(programApplicationEvents);

    const { count } = await prisma.programApplicationEvent.createMany({
      data: programApplicationEvents,
    });

    console.log(`Created ${count} program application events`);
  }
}

main();
