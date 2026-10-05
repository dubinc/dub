import { getPendingSocialMetricsMilestones } from "@/lib/bounty/social-metrics-milestones";
import { prisma } from "@/lib/prisma";
import { BountySubmissionStatus } from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 500;

// Moves partially approved social metrics submissions from submitted to partiallyApproved
// Submissions that already reached a new milestone stay submitted so they remain in the review queue
// Safe to re-run: only submitted submissions with an approved threshold are updated
async function main() {
  console.log(`DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE}`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const submissions = await prisma.bountySubmission.findMany({
      where: {
        status: BountySubmissionStatus.submitted,
        approvedSocialMetricThreshold: {
          not: null,
        },
        ...(cursor && {
          id: {
            gt: cursor,
          },
        }),
      },
      select: {
        id: true,
        socialMetricCount: true,
        approvedSocialMetricThreshold: true,
        bounty: {
          select: {
            rewardAmount: true,
            submissionRequirements: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (submissions.length === 0) {
      break;
    }

    const toUpdate = submissions.filter(
      (submission) =>
        getPendingSocialMetricsMilestones({
          bounty: submission.bounty,
          submission,
        }).length === 0,
    );

    let updated = toUpdate.length;

    if (DRY_RUN) {
      console.table(
        toUpdate.map(
          ({ id, socialMetricCount, approvedSocialMetricThreshold }) => ({
            id,
            socialMetricCount,
            approvedSocialMetricThreshold,
          }),
        ),
      );
    } else if (toUpdate.length > 0) {
      const results = await Promise.all(
        toUpdate.map(({ id, approvedSocialMetricThreshold }) =>
          prisma.bountySubmission.updateMany({
            where: {
              id,
              status: BountySubmissionStatus.submitted,
              approvedSocialMetricThreshold,
            },
            data: {
              status: BountySubmissionStatus.partiallyApproved,
            },
          }),
        ),
      );

      updated = results.reduce((total, { count }) => total + count, 0);
    }

    cursor = submissions[submissions.length - 1].id;
    totalProcessed += submissions.length;
    totalUpdated += updated;

    console.log(
      `Processed ${submissions.length} submissions, ${DRY_RUN ? "would update" : "updated"} ${updated} (last submission: ${cursor})`,
    );
  }

  console.log(
    `Done. Processed ${totalProcessed} submissions, ${DRY_RUN ? "would set" : "set"} partiallyApproved on ${totalUpdated}.`,
  );
}

main();
