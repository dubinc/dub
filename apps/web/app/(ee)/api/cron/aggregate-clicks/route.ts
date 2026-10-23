import { withCron } from "@/lib/cron/with-cron";
import { aggregateClicksJob } from "@/lib/jobs/handlers/aggregate-clicks-job";
import { getClickRewardEnrollments } from "@/lib/rewards/get-click-reward-enrollments";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// POST /api/cron/aggregate-clicks
export const POST = withCron(async () => {
  const now = new Date();

  // Set 'start' to the beginning of the previous day (00:00:00)
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  startDate.setHours(0, 0, 0, 0);

  // Set 'end' to the end of the previous day (23:59:59)
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);

  let startingAfterId: string | undefined;
  let enqueued = 0;

  while (true) {
    const programEnrollments = await getClickRewardEnrollments({
      startDate,
      startingAfterId,
      take: BATCH_SIZE,
    });

    if (programEnrollments.length === 0) {
      break;
    }

    const { published } = await aggregateClicksJob.dispatchBatch(
      programEnrollments.map(({ programId, partnerId }) => ({
        partnerId,
        programId,
        startDate,
        endDate,
      })),
      ({ partnerId }, index) => ({
        label: partnerId,
        deduplicationId: `aggregate-clicks-${programEnrollments[index].id}`,
        flowControl: {
          key: "aggregate-clicks",
          parallelism: 10,
        },
      }),
    );

    enqueued += published;

    if (programEnrollments.length < BATCH_SIZE) {
      break;
    }

    startingAfterId = programEnrollments[programEnrollments.length - 1].id;
  }

  if (enqueued === 0) {
    return logAndRespond("No program enrollments found. Skipping...");
  }

  return logAndRespond(
    `Enqueued aggregate clicks jobs for ${enqueued} enrollments.`,
  );
});
