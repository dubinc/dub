import { prisma } from "@/lib/prisma";
import { yearMonthSchema } from "@/lib/zod/schemas/misc";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";
import { sendPartnerProgramSummaryJob } from "./send-partner-program-summary-job";

const PARTNER_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 10;

const inputSchema = z.object({
  yearMonth: yearMonthSchema,
  startingAfter: z.string().optional(),
});

// Pages distinct eligible partnerIds by partnerId cursor, keeps partners with
// email + monthlyProgramSummary enabled, and dispatches one
// send-partner-program-summary-job per partner. Self-continues with a partner
// cursor.
export const queuePartnerProgramSummaryJob = defineJob({
  name: "queue-partner-program-summary-job",
  schema: inputSchema,
  async handle(input) {
    const { yearMonth } = input;
    let startingAfter = input.startingAfter;
    let partnerCount = 0;
    let hasMore = false;

    for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
      const cursorFragment = startingAfter
        ? Prisma.sql`AND pe.partnerId > ${startingAfter}`
        : Prisma.sql``;

      const rows = await prisma.$queryRaw<{ partnerId: string }[]>(Prisma.sql`
        SELECT DISTINCT pe.partnerId
        FROM ProgramEnrollment pe
        WHERE pe.status = 'approved'
          AND pe.totalLeads > 0
          ${cursorFragment}
        ORDER BY pe.partnerId ASC
        LIMIT ${PARTNER_BATCH_SIZE}
      `);

      if (rows.length === 0) {
        if (partnerCount === 0 && !input.startingAfter) {
          console.info(`No eligible partners found for ${yearMonth}.`);
          return;
        }

        hasMore = false;
        break;
      }

      // Advance cursor from the raw page so filtered-out partners are not re-read
      startingAfter = rows[rows.length - 1].partnerId;
      hasMore = rows.length === PARTNER_BATCH_SIZE;

      const partners = await prisma.partner.findMany({
        where: {
          id: {
            in: rows.map((r) => r.partnerId),
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
        },
      });

      if (partners.length > 0) {
        await sendPartnerProgramSummaryJob.dispatchBatch(
          partners.map(({ id: partnerId }) => ({
            partnerId,
            yearMonth,
          })),
          ({ partnerId }) => ({
            deduplicationId: `send-program-summary-${partnerId}`,
            flowControl: {
              key: "send-program-summary",
              parallelism: 10,
            },
          }),
        );

        partnerCount += partners.length;
      }

      if (!hasMore) {
        break;
      }
    }

    if (hasMore && startingAfter) {
      await queuePartnerProgramSummaryJob.dispatch(
        {
          yearMonth,
          startingAfter,
        },
        {
          delay: 2,
        },
      );

      console.info(
        `Dispatched ${partnerCount} send jobs for ${yearMonth}. Scheduled next batch (startingAfter: ${startingAfter}).`,
      );
      return;
    }

    console.info(`Dispatched ${partnerCount} send jobs for ${yearMonth}.`);
  },
});
