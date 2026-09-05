import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash/redis";
import { sendBatchEmail } from "@dub/email";
import PartnerProgramSummary from "@dub/email/templates/partner-program-summary";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import {
  getPartnerProgramSummaryKeys,
  getReportingPeriod,
  MAX_PROGRAMS_PER_SUMMARY,
  PARTNER_PROGRAM_SUMMARY_QUEUE,
  PartnerProgramSummaryStats,
  yearMonthSchema,
} from "../utils";

export const dynamic = "force-dynamic";

// Resend accepts up to 100 emails per batch
const PARTNER_BATCH_SIZE = 100;

const queue = qstash.queue({
  queueName: PARTNER_PROGRAM_SUMMARY_QUEUE,
});

const schema = z.object({
  yearMonth: yearMonthSchema,
  offset: z.number().int().nonnegative().default(0),
});

type PartnerProgramStats = Record<string, PartnerProgramSummaryStats>;

// Programs with the best month come first
function byCurrentMonthPerformance(
  a: PartnerProgramSummaryStats,
  b: PartnerProgramSummaryStats,
) {
  return (
    b.currentMonth.earnings - a.currentMonth.earnings ||
    b.currentMonth.sales - a.currentMonth.sales ||
    b.currentMonth.leads - a.currentMonth.leads ||
    b.currentMonth.clicks - a.currentMonth.clicks
  );
}

// This route sends the monthly summary email to a batch of partners using the stats
// staged in Redis by /process, then enqueues itself for the next batch.
// Enqueued by the main route after all the program jobs, so it runs once they have finished.
// POST /api/cron/partner-program-summary/send
export const POST = withCron(async ({ rawBody }) => {
  const { yearMonth, offset } = schema.parse(JSON.parse(rawBody));

  const keys = getPartnerProgramSummaryKeys(yearMonth);
  const { month, start, end } = getReportingPeriod(yearMonth);

  const partnerIds = await redis.zrange<string[]>(
    keys.partners,
    offset,
    offset + PARTNER_BATCH_SIZE - 1,
  );

  if (partnerIds.length === 0) {
    return logAndRespond(
      `No more partners to send program summary emails to for ${yearMonth}.`,
    );
  }

  // Only partners that opted in to the monthly summary (and have an email) are notified
  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: partnerIds,
      },
      email: {
        not: null,
      },
      users: {
        some: {
          notificationPreferences: {
            monthlyProgramSummary: true,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.info(
    `Found ${partners.length} partners with monthly summary notifications enabled out of ${partnerIds.length} partners in this batch.`,
  );

  let partnerStats: (PartnerProgramStats | null)[] = [];

  if (partners.length > 0) {
    const pipeline = redis.pipeline();

    for (const partner of partners) {
      pipeline.hgetall<PartnerProgramStats>(keys.partner(partner.id));
    }

    partnerStats = await pipeline.exec<(PartnerProgramStats | null)[]>();
  }

  const programIds = [
    ...new Set(partnerStats.flatMap((stats) => Object.keys(stats ?? {}))),
  ];

  // Programs may have been deactivated and partners may have lost their approval since the
  // stats were staged (or since an earlier run for this month), so both are rechecked here
  const [programs, approvedEnrollments] =
    programIds.length > 0
      ? await Promise.all([
          prisma.program.findMany({
            where: {
              id: {
                in: programIds,
              },
              deactivatedAt: null,
            },
            select: {
              id: true,
              name: true,
              logo: true,
              slug: true,
            },
          }),
          prisma.programEnrollment.findMany({
            where: {
              partnerId: {
                in: partners.map((partner) => partner.id),
              },
              programId: {
                in: programIds,
              },
              status: "approved",
            },
            select: {
              partnerId: true,
              programId: true,
            },
          }),
        ])
      : [[], []];

  const programsMap = new Map(programs.map((p) => [p.id, p]));

  const approvedPairs = new Set(
    approvedEnrollments.map((e) => `${e.partnerId}:${e.programId}`),
  );

  const emails = partners.flatMap((partner, index) => {
    const stats = partnerStats[index];

    if (!stats) {
      return [];
    }

    const partnerPrograms = Object.entries(stats)
      .flatMap(([programId, programStats]) => {
        const program = programsMap.get(programId);

        if (!program || !approvedPairs.has(`${partner.id}:${programId}`)) {
          return [];
        }

        return [{ ...program, ...programStats }];
      })
      .sort(byCurrentMonthPerformance)
      .slice(0, MAX_PROGRAMS_PER_SUMMARY);

    if (partnerPrograms.length === 0) {
      return [];
    }

    return [
      {
        partnerId: partner.id,
        email: partner.email!,
        programs: partnerPrograms,
      },
    ];
  });

  console.table(
    emails.map(({ partnerId, programs }) => ({
      partner: partnerId,
      programs: programs.length,
      topProgram: programs[0].slug,
      topProgramEarnings: programs[0].currentMonth.earnings,
    })),
  );

  await sendBatchEmail(
    emails.map(({ email, programs }) => ({
      variant: "notifications",
      subject: `Your ${month} partner program summary`,
      to: email,
      replyTo: "noreply",
      react: PartnerProgramSummary({
        email,
        programs,
        reportingPeriod: {
          month,
          start,
          end,
        },
      }),
    })),
    {
      idempotencyKey: `partner-program-summary-${yearMonth}-${offset}`,
    },
  );

  console.info(
    `Sent ${emails.length} partner program summary emails for ${yearMonth} (offset ${offset}).`,
  );

  // Schedule the next batch if there are more partners to process
  if (partnerIds.length === PARTNER_BATCH_SIZE) {
    const nextOffset = offset + PARTNER_BATCH_SIZE;

    const response = await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary/send`,
      method: "POST",
      deduplicationId: `partner-program-summary-${yearMonth}-send-${nextOffset}`,
      body: {
        yearMonth,
        offset: nextOffset,
      },
    });

    return logAndRespond(
      `Enqueued the next partner program summary email batch (offset ${nextOffset}): ${response.messageId}`,
    );
  }

  return logAndRespond(
    `Finished sending partner program summary emails for ${yearMonth}.`,
  );
});
