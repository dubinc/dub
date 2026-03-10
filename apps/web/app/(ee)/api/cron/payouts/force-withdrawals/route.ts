import { forceWithdrawal } from "@/lib/actions/partners/force-withdrawal";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// This route is used to force withdrawals for partners that haven't withdrew their earnings for than 90 days
// Runs once a day at 5AM PST (0 12 * * *) + calls itself recursively to process all partners in batches
async function handler(req: Request) {
  try {
    let rawBody: string | undefined;
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      rawBody = await req.text();
      await verifyQstashSignature({
        req,
        rawBody,
      });
    }

    let startingAfter: string | undefined;
    try {
      startingAfter = schema.parse(
        rawBody ? JSON.parse(rawBody) : {},
      ).startingAfter;
    } catch {
      startingAfter = undefined;
    }

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
      if (qstashResponse.messageId) {
        console.log(
          `Message sent to Qstash with id ${qstashResponse.messageId}`,
        );
      } else {
        await log({
          message: `Error sending message to Qstash to schedule next batch of force withdrawals: ${JSON.stringify(qstashResponse)}`,
          type: "errors",
          mention: true,
        });
      }
      return logAndRespond(
        `Finished force withdrawals for current batch. Scheduling next batch (startingAfter: ${nextStartingAfter})...`,
      );
    }

    return logAndRespond("Finished force withdrawals for all batches.");
  } catch (error) {
    await log({
      message: `Error force withdrawing: ${error.message}`,
      type: "errors",
      mention: true,
    });
    return handleAndReturnErrorResponse(error);
  }
}

// GET/POST /api/cron/payouts/force-withdrawals
export { handler as GET, handler as POST };
