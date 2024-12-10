import { enrollDotsUserApp } from "@/lib/actions/partners/enroll-dots-user-app";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const programId = "***";
const dotsAppId = "***";

// REMEMBER TO CHANGE TO PROD ENVS FIRST OR THIS WONT WORK
async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      programs: {
        some: {
          dotsUserId: null,
          programId: programId,
        },
      },
    },
    include: {
      programs: {
        where: {
          programId,
        },
      },
    },
    take: 10,
    orderBy: {
      createdAt: "asc",
    },
  });

  await Promise.all(
    partners.map(async (partner) => {
      const res = await enrollDotsUserApp({
        partner,
        dotsAppId,
        programEnrollmentId: partner.programs[0].id,
      });
      console.log(res);
    }),
  );
}

main();
