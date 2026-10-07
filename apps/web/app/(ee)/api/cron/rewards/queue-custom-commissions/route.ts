import { getUtcPeriodDate } from "@/lib/api/rewards/custom-reward-utils";
import { findDueCustomRewards } from "@/lib/api/rewards/find-due-custom-rewards";
import { withCron } from "@/lib/cron/with-cron";
import { createCustomCommissionJob } from "@/lib/jobs/handlers/create-custom-commission-job";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

// GET /api/cron/rewards/queue-custom-commissions
// Fans out create-custom-commission-job for each due custom reward (daily UTC).
export const GET = withCron(async () => {
  const periodDate = getUtcPeriodDate();
  const dueRewards = await findDueCustomRewards({ periodDate });

  if (dueRewards.length === 0) {
    return logAndRespond(
      `No due custom rewards for period ${periodDate}. Skipping...`,
    );
  }

  await createCustomCommissionJob.dispatchBatch(
    dueRewards.map((reward) => ({
      rewardId: reward.id,
      periodDate,
    })),
    ({ rewardId }) => ({
      label: rewardId,
      deduplicationId: `custom-commission-${rewardId}-${periodDate}`,
      flowControl: {
        key: "create-custom-commission",
        parallelism: 5,
      },
    }),
  );

  return logAndRespond(
    `Queued create-custom-commission-job for ${dueRewards.length} custom rewards (period ${periodDate}).`,
  );
});
