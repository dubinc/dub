import { getPendingSocialMetricsMilestones } from "@/lib/bounty/social-metrics-milestones";
import { prisma } from "@/lib/prisma";
import { BountySubmission, BountySubmissionStatus } from "@prisma/client";
import "dotenv-flow/config";

type SubmissionStatusUpdate = Pick<
  BountySubmission,
  "id" | "socialMetricCount" | "approvedSocialMetricThreshold"
> & {
  from: BountySubmissionStatus;
  to: Extract<BountySubmissionStatus, "submitted" | "partiallyApproved">;
};

// Dry run by default. Pass --dry-run=false to write the changes.
const DRY_RUN = !process.argv.slice(2).includes("--dry-run=false");
const BATCH_SIZE = 500;

// Moves partially approved social metrics submissions that are stuck in the review queue to partiallyApproved
// Moves submitted to partiallyApproved when no milestone is pending, on active and ended bounties
// Moves partiallyApproved back to submitted when a reached milestone was not paid, so the program can pay it
// Safe to re-run: only submitted or partiallyApproved submissions with an approved threshold are updated
async function main() {
  console.log(`DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE}`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const submissions = await prisma.bountySubmission.findMany({
      where: {
        status: {
          in: [
            BountySubmissionStatus.submitted,
            BountySubmissionStatus.partiallyApproved,
          ],
        },
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
        status: true,
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

    const updates: SubmissionStatusUpdate[] = [];

    for (const submission of submissions) {
      const hasPendingMilestones =
        getPendingSocialMetricsMilestones({
          bounty: submission.bounty,
          submission,
        }).length > 0;

      let to: SubmissionStatusUpdate["to"];

      if (
        submission.status === BountySubmissionStatus.submitted &&
        !hasPendingMilestones
      ) {
        to = BountySubmissionStatus.partiallyApproved;
      } else if (
        submission.status === BountySubmissionStatus.partiallyApproved &&
        hasPendingMilestones
      ) {
        // The sync does this on active bounties, but it stops when a bounty ends
        to = BountySubmissionStatus.submitted;
      } else {
        continue;
      }

      updates.push({
        id: submission.id,
        socialMetricCount: submission.socialMetricCount,
        approvedSocialMetricThreshold: submission.approvedSocialMetricThreshold,
        from: submission.status,
        to,
      });
    }

    let updated = updates.length;

    if (DRY_RUN) {
      console.table(updates);
    } else if (updates.length > 0) {
      const results = await Promise.all(
        updates.map(
          ({
            id,
            socialMetricCount,
            approvedSocialMetricThreshold,
            from,
            to,
          }) =>
            prisma.bountySubmission.updateMany({
              where: {
                id,
                status: from,
                approvedSocialMetricThreshold,
                // Skips the row if a sync changed the count after we read it
                socialMetricCount,
              },
              data: {
                status: to,
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
    `Done. Processed ${totalProcessed} submissions, ${DRY_RUN ? "would update" : "updated"} ${totalUpdated}.`,
  );
}

main();
