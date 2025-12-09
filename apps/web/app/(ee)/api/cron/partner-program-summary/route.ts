import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const PROGRAM_BATCH_SIZE = 50;

// GET /api/cron/partner-program-summary
export const GET = withCron(async () => {
  const currentMonth = startOfMonth(subMonths(new Date(), 1));
  const yearMonth = format(currentMonth, "yyyy-MM");

  console.log(yearMonth, currentMonth);

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
        deduplicationId: `partner-program-summary-${yearMonth}-${program.id}`,
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
