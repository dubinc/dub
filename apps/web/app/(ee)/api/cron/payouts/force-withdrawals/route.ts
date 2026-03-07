import { forceWithdrawal } from "@/lib/actions/partners/force-withdrawal";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID, APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;

// This route is used to force withdrawals for partners that haven't withdrew their earnings for than 90 days
// Runs once a day at 5AM PST + calls itself recursively to process all partners in batches
async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      await verifyQstashSignature({
        req,
        rawBody,
      });
    }

    // Get processed payouts grouped by partner
    const processedPayouts = await prisma.payout.groupBy({
      by: "partnerId",
      where: {
        status: "processed",
        programId: {
          not: ACME_PROGRAM_ID,
        },
        paidAt: {
          lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        },
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: BATCH_SIZE,
    });

    if (!processedPayouts.length) {
      return logAndRespond(
        "No processed payouts found. Skipping force withdrawals...",
      );
    }

    const hasMoreToProcess = processedPayouts.length === BATCH_SIZE;

    console.log(
      `Found ${processedPayouts.length} processed payouts${hasMoreToProcess ? " (more to process)" : ""}`,
    );

    const partnerData = await prisma.partner.findMany({
      where: {
        id: {
          in: processedPayouts.map((payout) => payout.partnerId),
        },
      },
      select: {
        id: true,
        defaultPayoutMethod: true,
      },
    });

    console.log(
      `Processing force withdrawals for ${partnerData.length} partners`,
    );

    await Promise.allSettled(
      partnerData.map((partner) => forceWithdrawal(partner)),
    );

    if (hasMoreToProcess) {
      console.log(
        "More partners need force withdrawals, scheduling next batch...",
      );

      const qstashResponse = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/force-withdrawals`,
        body: {},
      });
      if (qstashResponse.messageId) {
        console.log(
          `Message sent to Qstash with id ${qstashResponse.messageId}`,
        );
      } else {
        // should never happen, but just in case
        await log({
          message: `Error sending message to Qstash to schedule next batch of force withdrawals: ${JSON.stringify(qstashResponse)}`,
          type: "errors",
          mention: true,
        });
      }
      return logAndRespond(
        "Finished force withdrawals for current batch. Scheduling next batch...",
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
