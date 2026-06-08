import { FRAUD_GROUP_EXPIRY_DAYS } from "@/lib/api/fraud/constants";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { subDays } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// This route is used to expire fraud event groups after 30 days
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// POST /api/cron/cleanup/expire-fraud-groups
export const POST = withCron(async () => {
  const expiredFraudGroups = await prisma.fraudEventGroup.findMany({
    where: {
      status: "pending",
      lastEventAt: {
        lt: subDays(new Date(), FRAUD_GROUP_EXPIRY_DAYS),
      },
    },
  });

  if (expiredFraudGroups.length === 0) {
    return logAndRespond("No expired fraud groups found.");
  }

  console.log(`Found ${expiredFraudGroups.length} expired fraud groups`);

  const { count } = await prisma.fraudEventGroup.updateMany({
    where: {
      id: {
        in: expiredFraudGroups.map((event) => event.id),
      },
      status: "pending",
    },
    data: {
      status: "expired",
    },
  });

  return logAndRespond(
    `Finished expiring fraud groups (${count} fraud groups expired).`,
  );
});
