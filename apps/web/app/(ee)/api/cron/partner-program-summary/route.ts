import { qstash } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { logAndRespond } from "../utils";
import { PARTNER_PROGRAM_SUMMARY_QUEUE } from "./utils";

export const dynamic = "force-dynamic";

const PROGRAM_BATCH_SIZE = 50;

const queue = qstash.queue({
  queueName: PARTNER_PROGRAM_SUMMARY_QUEUE,
});

// This route kicks off the monthly partner program summary emails.
// Scheduled to run at 1 PM UTC on the 1st day of every month to send the previous month's summary.
//
// Each partner receives a single email covering all of their programs, so the work happens in two phases
// that go through the same QStash queue with parallelism 1 (jobs run one at a time, in the order they were enqueued):
// 1. /process – one job per program that computes the stats of every partner in that program and stages them in Redis
// 2. /send – enqueued last, so it only runs once every program has been processed; sends one email per partner
// GET /api/cron/partner-program-summary
export const GET = withCron(async () => {
  const currentMonth = startOfMonth(subMonths(new Date(), 1));
  const yearMonth = format(currentMonth, "yyyy-MM");

  // The send phase relies on the queue being sequential
  await queue.upsert({ parallelism: 1 });

  let startingAfter: string | undefined;
  let programCount = 0;

  while (true) {
    const programs = await prisma.program.findMany({
      where: {
        deactivatedAt: null,
        partners: {
          some: {
            status: "approved",
            totalLeads: {
              gt: 0,
            },
          },
        },
      },
      select: {
        id: true,
      },
      ...(startingAfter && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
      take: PROGRAM_BATCH_SIZE,
    });

    if (programs.length === 0) {
      break;
    }

    await enqueueBatchJobs(
      programs.map((program) => ({
        queueName: PARTNER_PROGRAM_SUMMARY_QUEUE,
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary/process`,
        deduplicationId: `partner-program-summary-${yearMonth}-${program.id}`,
        body: {
          programId: program.id,
          yearMonth,
        },
      })),
    );

    programCount += programs.length;
    startingAfter = programs[programs.length - 1].id;
  }

  if (programCount === 0) {
    return logAndRespond(
      `No programs with approved partners found for ${yearMonth}. Skipping...`,
    );
  }

  // Enqueued after every program job, so it runs once they have all been processed
  await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary/send`,
    method: "POST",
    deduplicationId: `partner-program-summary-${yearMonth}-send-0`,
    body: {
      yearMonth,
    },
  });

  return logAndRespond(
    `Enqueued partner program summary jobs for ${programCount} programs for ${yearMonth}.`,
  );
});
