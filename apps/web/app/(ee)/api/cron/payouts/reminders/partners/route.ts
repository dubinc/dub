import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID, APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
// Runs once a day at 7AM PST but only notifies partners every 3 days
// + calls itself recursively to process all partners in batches
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

    // Get pending payouts grouped by partner and program, ordered by amount desc
    const pendingPayouts = await prisma.payout.groupBy({
      by: ["partnerId", "programId"],
      where: {
        status: "pending",
        programId: {
          not: ACME_PROGRAM_ID,
        },
        partner: {
          payoutsEnabledAt: null,
          OR: [
            { connectPayoutsLastRemindedAt: null },
            {
              connectPayoutsLastRemindedAt: {
                lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Last notified was at least 3 days ago
              },
            },
          ],
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

    if (!pendingPayouts.length) {
      return logAndRespond("No action needed.");
    }

    const hasMoreToProcess = pendingPayouts.length === BATCH_SIZE;

    console.log(
      `Found ${pendingPayouts.length} partner-program combinations needing reminders${hasMoreToProcess ? " (more to process)" : ""}`,
    );

    const [partnerData, programData] = await Promise.all([
      prisma.partner.findMany({
        where: {
          id: {
            in: pendingPayouts.map((payout) => payout.partnerId),
          },
        },
      }),

      prisma.program.findMany({
        where: {
          id: {
            in: pendingPayouts.map((payout) => payout.programId),
          },
        },
      }),
    ]);

    const partnerProgramMap = new Map<
      string,
      {
        partner: {
          id: string;
          name: string;
          email: string;
        };
        programs: {
          id: string;
          name: string;
          logo: string;
          amount: number;
        }[];
      }
    >();

    for (const payout of pendingPayouts) {
      const { partnerId, programId } = payout;
      const { amount } = payout._sum;

      const partner = partnerData.find((p) => p.id === partnerId);
      const program = programData.find((p) => p.id === programId);

      if (!partner?.email || !program) {
        continue;
      }

      if (!partnerProgramMap.has(partnerId)) {
        partnerProgramMap.set(partnerId, {
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
          },
          programs: [],
        });
      }

      partnerProgramMap.get(partnerId)!.programs.push({
        id: program.id,
        name: program.name,
        logo: program.logo!,
        amount: amount ?? 0,
      });
    }

    const partnerPrograms = Array.from(partnerProgramMap.values());
    const connectPayoutsLastRemindedAt = new Date();

    console.log(
      `Processing ConnectPayoutReminder for ${partnerPrograms.length} partners`,
    );

    await queueBatchEmail<typeof ConnectPayoutReminder>(
      partnerPrograms.map(({ partner, programs }) => ({
        variant: "notifications",
        to: partner.email,
        subject: "Connect your payout details on Dub Partners",
        templateName: "ConnectPayoutReminder",
        templateProps: {
          email: partner.email,
          programs,
        },
      })),
    );

    console.log(
      `Queued ConnectPayoutReminder emails for ${partnerPrograms.length} partners`,
    );

    await prisma.partner.updateMany({
      where: {
        id: {
          in: partnerPrograms.map(({ partner }) => partner.id),
        },
      },
      data: {
        connectPayoutsLastRemindedAt,
      },
    });

    if (hasMoreToProcess) {
      console.log("More partners need reminders, scheduling next batch...");

      const qstashResponse = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/reminders/partners`,
        body: {},
      });
      if (qstashResponse.messageId) {
        console.log(
          `Message sent to Qstash with id ${qstashResponse.messageId}`,
        );
      } else {
        // should never happen, but just in case
        await log({
          message: `Error sending message to Qstash to schedule next batch of payout reminders: ${JSON.stringify(qstashResponse)}`,
          type: "errors",
          mention: true,
        });
      }
      return logAndRespond(
        "Finished sending payout reminders for current batch. Scheduling next batch...",
      );
    }

    return logAndRespond("Finished sending payout reminders for all batches.");
  } catch (error) {
    await log({
      message: `Error sending payout reminders: ${error.message}`,
      type: "errors",
      mention: true,
    });
    return handleAndReturnErrorResponse(error);
  }
}

// GET/POST /api/cron/payouts/reminders/partners
export { handler as GET, handler as POST };
