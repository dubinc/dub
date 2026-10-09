import { getSocialMetricsMilestones } from "@/lib/bounty/social-metrics-milestones";
import { prisma } from "@/lib/prisma";
import {
  BountySubmission,
  BountySubmissionStatus,
  Commission,
  CommissionStatus,
} from "@prisma/client";
import "dotenv-flow/config";

type SubmissionThresholdUpdate = Pick<BountySubmission, "id"> & {
  approvedSocialMetricThreshold: number;
  status: Extract<BountySubmissionStatus, "partiallyApproved" | "approved">;
};

type SkippedSubmission = Pick<BountySubmission, "id"> &
  Pick<Commission, "earnings"> & {
    reason: string;
  };

const DRY_RUN = true;
const BATCH_SIZE = 500;

const PAID_COMMISSION_STATUSES: CommissionStatus[] = [
  "pending",
  "processed",
  "paid",
  "hold",
];

// Backfill BountySubmission.approvedSocialMetricThreshold for social metrics submissions approved before the column existed
// The threshold is derived from the commission earnings (the stored socialMetricCount can be past what was actually paid)
// If the paid threshold is below the earning cap, sets status to partiallyApproved so the sync can reopen it at the next milestone
// Safe to re-run: only approved submissions with a null threshold are updated
// Run backfill-bounty-submission-commissions.ts first: commissions are looked up by Commission.bountySubmissionId only
async function main() {
  console.log(`DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE}`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalReopened = 0;
  let totalSkipped = 0;

  while (true) {
    const submissions = await prisma.bountySubmission.findMany({
      where: {
        status: "approved",
        approvedSocialMetricThreshold: null,
        socialMetricCount: {
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

    const commissions = await prisma.commission.findMany({
      where: {
        status: {
          in: PAID_COMMISSION_STATUSES,
        },
        bountySubmissionId: {
          in: submissions.map(({ id }) => id),
        },
      },
      select: {
        bountySubmissionId: true,
        earnings: true,
      },
    });

    const updates: SubmissionThresholdUpdate[] = [];
    const skipped: SkippedSubmission[] = [];

    for (const { id, bounty } of submissions) {
      const milestones = getSocialMetricsMilestones(bounty);

      if (milestones.length === 0) {
        continue;
      }

      const submissionCommissions = commissions.filter(
        ({ bountySubmissionId }) => bountySubmissionId === id,
      );

      const earnings = submissionCommissions.reduce(
        (sum, commission) => sum + commission.earnings,
        0,
      );

      if (submissionCommissions.length === 0) {
        skipped.push({
          id,
          earnings,
          reason: "no commission",
        });
        continue;
      }

      let cumulative = 0;
      let paidIndex = -1;

      for (const [index, { rewardAmount }] of milestones.entries()) {
        if (cumulative + rewardAmount > earnings) {
          break;
        }

        cumulative += rewardAmount;
        paidIndex = index;
      }

      if (paidIndex === -1) {
        skipped.push({
          id,
          earnings,
          reason: "below first milestone",
        });
        continue;
      }

      if (cumulative !== earnings) {
        skipped.push({
          id,
          earnings,
          reason: "not a milestone total",
        });
        continue;
      }

      updates.push({
        id,
        approvedSocialMetricThreshold: milestones[paidIndex].threshold,
        status:
          paidIndex === milestones.length - 1
            ? BountySubmissionStatus.approved
            : BountySubmissionStatus.partiallyApproved,
      });
    }

    const reopened = updates.filter(
      ({ status }) => status === BountySubmissionStatus.partiallyApproved,
    ).length;

    let updated = updates.length;

    if (skipped.length > 0) {
      console.table(skipped);
    }

    if (DRY_RUN) {
      console.table(updates);
    } else if (updates.length > 0) {
      const results = await Promise.all(
        updates.map(({ id, approvedSocialMetricThreshold, status }) =>
          prisma.bountySubmission.updateMany({
            where: {
              id,
              status: "approved",
              approvedSocialMetricThreshold: null,
            },
            data: {
              approvedSocialMetricThreshold,
              status,
            },
          }),
        ),
      );

      updated = results.reduce((total, { count }) => total + count, 0);
    }

    cursor = submissions[submissions.length - 1].id;
    totalProcessed += submissions.length;
    totalUpdated += updated;
    totalReopened += reopened;
    totalSkipped += skipped.length;

    const updatedLabel = DRY_RUN ? "would update" : "updated";
    const reopenedLabel = DRY_RUN ? "would reopen" : "reopened";

    console.log(
      `Processed ${submissions.length} submissions, ${updatedLabel} ${updated}, ${reopenedLabel} ${reopened}, skipped ${skipped.length} (last submission: ${cursor})`,
    );
  }

  console.log(
    `Done. Processed ${totalProcessed} submissions, ${DRY_RUN ? "would set" : "set"} approvedSocialMetricThreshold on ${totalUpdated}, ${DRY_RUN ? "would reopen" : "reopened"} ${totalReopened}, skipped ${totalSkipped}.`,
  );
}

main();
