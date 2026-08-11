import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { CommissionStatus } from "@prisma/client";
import { PublishBatchRequest } from "@upstash/qstash";
import { logAndRespond } from "../../utils";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

// This cron job aggregates due commissions (pending commissions that are past the partner group's holding period) into payouts.
// Runs once every hour (0 * * * *) + calls itself recursively to look through all pending commissions available.
// GET /api/cron/payouts/aggregate-due-commissions
export const GET = withCron(async ({ rawBody }) => {
  const programsWithDueCommissions = await prisma.commission.groupBy({
    by: ["programId"],
    where: {
      status: CommissionStatus.pending,
    },
    _count: {
      id: true,
    },
  });

  const programIds = programsWithDueCommissions.map((p) => p.programId);

  if (programIds.length === 0) {
    return logAndRespond("No programs with due commissions found. Skipping...");
  }

  console.table(programsWithDueCommissions);

  const programIdChunks = chunk(programIds, 50);

  for (const [index, programIdChunk] of programIdChunks.entries()) {
    const jobs: PublishBatchRequest<{ programId: string }>[] =
      programIdChunk.map((programId) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions/process`,
        body: {
          programId,
        },
        deduplicationId: `aggregate-due-commissions-${programId}`,
        label: "aggregate-due-commissions",
        flowControl: {
          key: `aggregate-due-commissions-${programId}`,
          parallelism: 1,
          rate: 5,
          period: "1s",
        },
      }));

    await qstash.batchJSON(jobs);

    console.log(
      `Enqueued index ${index + 1}/${programIdChunks.length} jobs to be processed.`,
    );
  }

  return logAndRespond(
    "Finished aggregating due commissions into payouts for all batches.",
  );
});
