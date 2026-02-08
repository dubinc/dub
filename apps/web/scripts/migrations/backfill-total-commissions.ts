import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const commissions = await prisma.commission.groupBy({
    by: ["partnerId", "programId"],
    where: {
      earnings: {
        gt: 0,
      },
      status: {
        in: ["pending", "processed", "paid"],
      },
    },
    _sum: {
      earnings: true,
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
  });

  console.table(
    `Found ${commissions.length} partner-program pairs with commissions`,
  );

  const where: Prisma.ProgramEnrollmentWhereInput = {
    OR: commissions.map(({ partnerId, programId }) => ({
      partnerId,
      programId,
    })),
    totalCommissions: 0,
  };

  const programEnrollmentsToUpdate = await prisma.programEnrollment.findMany({
    where,
    take: 100,
  });

  for (const programEnrollment of programEnrollmentsToUpdate) {
    await syncTotalCommissions({
      partnerId: programEnrollment.partnerId,
      programId: programEnrollment.programId,
    });
  }

  console.log(
    `Updated ${programEnrollmentsToUpdate.length} program enrollments`,
  );

  const remainingProgramEnrollments = await prisma.programEnrollment.count({
    where,
  });

  console.log(
    `${remainingProgramEnrollments} remaining program enrollments to update`,
  );
}

main();
