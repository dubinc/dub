import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10000;

// This cron job aggregates due commissions (pending commissions that are past the program holding period) into payouts.
// Runs once every hour (0 * * * *) + calls itself recursively to look through all pending commissions available.
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

    const programsByHoldingPeriod = await prisma.program.groupBy({
      by: ["holdingPeriodDays"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    let holdingPeriodsWithMoreToProcess: number[] = [];
    for (const { holdingPeriodDays } of programsByHoldingPeriod) {
      const programs = await prisma.program.findMany({
        where: {
          holdingPeriodDays,
        },
        select: {
          id: true,
          name: true,
        },
      });

      console.log(
        `Found ${programs.length} programs with holding period days: ${holdingPeriodDays}`,
      );

      // Find all due commissions (limit by BATCH_SIZE)
      const dueCommissions = await prisma.commission.findMany({
        where: {
          status: "pending",
          programId: {
            in: programs.map((p) => p.id),
          },
          // If holding period days is greater than 0:
          // we only process commissions that were created before the holding period
          // but custom commissions are always included
          ...(holdingPeriodDays > 0
            ? {
                OR: [
                  {
                    type: "custom", // includes manual commissions + clawbacks
                  },
                  {
                    createdAt: {
                      lt: new Date(
                        Date.now() - holdingPeriodDays * 24 * 60 * 60 * 1000,
                      ),
                    },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          createdAt: true,
          earnings: true,
          partnerId: true,
          programId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: BATCH_SIZE,
      });

      if (dueCommissions.length === 0) {
        console.log(
          `No more due commissions found for programs with holding period days: ${holdingPeriodDays}, skipping...`,
        );
        continue;
      }

      if (dueCommissions.length === BATCH_SIZE) {
        holdingPeriodsWithMoreToProcess.push(holdingPeriodDays);
      }

      console.log(
        `Found ${dueCommissions.length} due commissions for programs with holding period days: ${holdingPeriodDays}`,
      );

      const partnerProgramCommissions = dueCommissions.reduce<
        Record<string, typeof dueCommissions>
      >((acc, commission) => {
        const key = `${commission.partnerId}:${commission.programId}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(commission);
        return acc;
      }, {});

      const partnerProgramCommissionsArray = Object.entries(
        partnerProgramCommissions,
      ).map(([key, commissions]) => ({
        partnerId: key.split(":")[0],
        programId: key.split(":")[1],
        commissions,
      }));

      const existingPendingPayouts = await prisma.payout.findMany({
        where: {
          programId: {
            in: partnerProgramCommissionsArray.map((p) => p.programId),
          },
          partnerId: {
            in: partnerProgramCommissionsArray.map((p) => p.partnerId),
          },
          status: "pending",
        },
      });

      console.log(
        `Processing ${partnerProgramCommissionsArray.length} partners with due commissions for programs with holding period days: ${holdingPeriodDays}`,
      );
      let totalProcessed = 0;

      for (const {
        partnerId,
        programId,
        commissions,
      } of partnerProgramCommissionsArray) {
        // sort the commissions by createdAt
        const sortedCommissions = commissions.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

        // sum the earnings of the commissions
        const totalEarnings = sortedCommissions.reduce(
          (total, commission) => total + commission.earnings,
          0,
        );

        // earliest commission date
        const periodStart = sortedCommissions[0].createdAt;

        // last commission date
        const periodEnd =
          sortedCommissions[sortedCommissions.length - 1].createdAt;

        let payoutToUse = existingPendingPayouts.find(
          (p) => p.partnerId === partnerId && p.programId === programId,
        );

        if (!payoutToUse) {
          payoutToUse = await prisma.payout.create({
            data: {
              id: createId({ prefix: "po_" }),
              programId,
              partnerId,
              periodStart,
              periodEnd,
              amount: totalEarnings,
              description: `Dub Partners payout (${programs.find((p) => p.id === programId)?.name})`,
            },
          });
        }

        // update the commissions to have the payoutId
        await prisma.commission.updateMany({
          where: {
            id: { in: commissions.map((c) => c.id) },
          },
          data: {
            status: "processed",
            payoutId: payoutToUse.id,
          },
        });

        // if we're reusing a pending payout, we need to update the amount and periodEnd
        if (existingPendingPayouts.find((p) => p.id === payoutToUse.id)) {
          await prisma.payout.update({
            where: {
              id: payoutToUse.id,
            },
            data: {
              amount: {
                increment: totalEarnings,
              },
              periodEnd,
            },
          });
        }

        totalProcessed++;
      }

      const successRate =
        (totalProcessed / partnerProgramCommissionsArray.length) * 100;
      console.log(
        `Processed ${totalProcessed}/${partnerProgramCommissionsArray.length} partners with due commissions for programs with holding period days: ${holdingPeriodDays} (${successRate.toFixed(1)}% success rate)`,
      );
    }

    if (holdingPeriodsWithMoreToProcess.length > 0) {
      console.log(
        `Several holding periods still have more due commissions: ${holdingPeriodsWithMoreToProcess.join(", ")}`,
      );

      const qstashResponse = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions`,
      });
      if (qstashResponse.messageId) {
        console.log(
          `Message sent to Qstash with id ${qstashResponse.messageId}`,
        );
      } else {
        // should never happen, but just in case
        await log({
          message: `Error sending message to Qstash to schedule next batch of payouts: ${JSON.stringify(qstashResponse)}`,
          type: "errors",
          mention: true,
        });
      }
      return logAndRespond(
        "Finished aggregating due commissions into payouts for current batch. Scheduling next batch...",
      );
    }

    return logAndRespond(
      "Finished aggregating due commissions into payouts for all batches.",
    );
  } catch (error) {
    await log({
      message: `Error aggregating due commissions into payouts: ${error.message}`,
      type: "errors",
      mention: true,
    });
    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
