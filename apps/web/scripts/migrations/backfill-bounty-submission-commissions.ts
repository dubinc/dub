import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

// Backfill Commission.bountySubmissionId from the legacy BountySubmission.commissionId
async function main() {
  let cursor: string | undefined;
  let totalLinked = 0;

  while (true) {
    const submissions = await prisma.bountySubmission.findMany({
      where: {
        commissionId: {
          not: null,
        },
      },
      select: {
        id: true,
        commissionId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    if (submissions.length === 0) {
      break;
    }

    cursor = submissions[submissions.length - 1].id;

    const results = await prisma.$transaction(
      submissions.map(({ id, commissionId }) =>
        prisma.commission.updateMany({
          where: {
            id: commissionId!,
            bountySubmissionId: null,
          },
          data: {
            bountySubmissionId: id,
          },
        }),
      ),
    );

    const linked = results.reduce((total, { count }) => total + count, 0);
    totalLinked += linked;

    console.log(
      `Processed ${submissions.length} submissions, linked ${linked} commissions (total linked: ${totalLinked})`,
    );
  }

  console.log(`Done. Linked ${totalLinked} commissions.`);
}

main();
