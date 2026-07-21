import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

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
        createdAt: true,
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

    await Promise.all(
      programEnrollments.map(({ id, createdAt }) =>
        prisma.programEnrollment.update({
          where: {
            id,
          },
          data: {
            groupJoinedAt: createdAt,
          },
        }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`Backfilled ${programEnrollments.length} enrollments...`);
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
