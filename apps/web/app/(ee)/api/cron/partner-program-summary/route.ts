import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const PROGRAM_BATCH_SIZE = 50;

// This route handles the monthly partner program summary emails for partners.
// Scheduled to run at 1 PM UTC on the 1st day of every month to send the previous month's summary.
// GET /api/cron/partner-program-summary
export const GET = withCron(async () => {
  const currentMonth = startOfMonth(subMonths(new Date(), 1));
  const yearMonth = format(currentMonth, "yyyy-MM");

  let page = 0;

  while (true) {
    const programs = await prisma.program.findMany({
      select: {
        id: true,
      },
      take: PROGRAM_BATCH_SIZE,
      skip: page * PROGRAM_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (programs.length === 0) {
      break;
    }

    await enqueueBatchJobs(
      programs.map((program) => ({
        queueName: "partner-program-summary",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary/process`,
        deduplicationId: `partner-program-summary-${yearMonth}-${program.id}-4`,
        body: {
          programId: program.id,
        },
      })),
    );

    page++;
  }

  return logAndRespond(
    `Enqueued partner program summary jobs for ${yearMonth}.`,
  );
});
