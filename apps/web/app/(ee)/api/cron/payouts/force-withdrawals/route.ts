import { forceWithdrawal } from "@/lib/actions/partners/force-withdrawal";
import { MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// This route is used to force withdrawals for partners that haven't withdrew their earnings for than 90 days
// Runs once a day at 5AM PST (0 12 * * *) + calls itself recursively to process all partners in batches
// GET/POST /api/cron/payouts/force-withdrawals

export const GET = withCron(async ({ rawBody }) => {
  let { startingAfter } = schema.parse(rawBody ? JSON.parse(rawBody) : {});

  // Get batch of partners with processed payouts (cursor-based pagination)
  const partnersToProcess = await prisma.partner.findMany({
    where: {
      payoutsEnabledAt: {
        not: null,
      },
      defaultPayoutMethod: {
        in: ["stablecoin", "connect"],
      },
      payouts: {
        some: {
          status: "processed",
          amount: {
            gte: MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS,
          },
          paidAt: {
            lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          },
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    select: {
      id: true,
      defaultPayoutMethod: true,
    },
  });

  if (!partnersToProcess.length) {
    return logAndRespond(
      "No partners to process. Skipping force withdrawals...",
    );
  }

  const hasMoreToProcess = partnersToProcess.length === BATCH_SIZE;

  console.log(
    `Found ${partnersToProcess.length} partners to process${hasMoreToProcess ? " (more to process)" : ""}`,
  );

  await Promise.allSettled(
    partnersToProcess.map((partner) => forceWithdrawal(partner)),
  );

  if (hasMoreToProcess) {
    console.log(
      "More partners need force withdrawals, scheduling next batch...",
    );

    const nextStartingAfter =
      partnersToProcess[partnersToProcess.length - 1].id;

    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/force-withdrawals`,
      method: "POST",
      body: {
        startingAfter: nextStartingAfter,
      },
    });

    if (!qstashResponse.messageId) {
      throw new Error(
        `Error sending message to Qstash to schedule next batch of force withdrawals: ${JSON.stringify(qstashResponse)}`,
      );
    }

    return logAndRespond(
      `Finished force withdrawals for current batch. Scheduling next batch (startingAfter: ${nextStartingAfter})...`,
    );
  }

  return logAndRespond("Finished force withdrawals for all batches.");
});

export const POST = GET;
