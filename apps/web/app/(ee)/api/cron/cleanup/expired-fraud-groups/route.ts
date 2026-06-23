import { FRAUD_GROUP_EXPIRY_DAYS } from "@/lib/api/fraud/constants";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 250;

// This route is used to expire fraud event groups after 30 days
// Runs once every day at 02:30:00 AM UTC (30 2 * * *)
// POST /api/cron/cleanup/expired-fraud-groups
export const POST = withCron(async () => {
  // TODO: remove this after July 9th, 2026
  // skip cron if it's before July 9th, 2026
  if (new Date() < new Date("2026-07-09")) {
    return logAndRespond("Skipping cron because it's before July 9th, 2026.");
  }

  let expiredCount = 0;
  while (true) {
    const { count } = await prisma.fraudEventGroup.updateMany({
      where: {
        status: "pending",
        lastEventAt: {
          lt: subDays(new Date(), FRAUD_GROUP_EXPIRY_DAYS),
        },
      },
      data: {
        status: "expired",
      },
      limit: BATCH_SIZE,
    });

    expiredCount += count;
    console.log(`Expired ${count} fraud groups`);

    if (count < BATCH_SIZE) {
      break;
    }
  }

  return logAndRespond(
    `Finished expiring fraud groups (${expiredCount} total fraud groups expired).`,
  );
});
