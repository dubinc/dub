import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 5000;

// This cron job aggregates due commissions (pending commissions that are past the program holding period) into payouts.
// Runs once every hour (0 * * * *) + calls itself recursively to look through all pending commissions available.
async function handler(req: Request) {
  try {
    let skip: number = 0;

    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      const jsonBody = z
        .object({
          skip: z.number(),
        })
        .parse(JSON.parse(rawBody));
      skip = jsonBody.skip;
      await verifyQstashSignature({
        req,
        rawBody,
      });
    }

    const groupedCommissions = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        status: "pending",
        payoutId: null,
      },
      skip,
      take: BATCH_SIZE,
      orderBy: {
        partnerId: "asc",
      },
    });

    if (!groupedCommissions.length) {
      return logAndRespond(
        `No partner-program pair with pending commissions found. Skipping...`,
      );
    }

    console.log(
      `Found ${groupedCommissions.length} partner-program pairs with pending commissions to process...`,
    );

    const programIdsToPartnerIds = groupedCommissions.reduce<
      Record<string, string[]>
    >((acc, { programId, partnerId }) => {
      acc[programId] ??= [];
      if (!acc[programId].includes(partnerId)) {
        acc[programId].push(partnerId);
      }
      return acc;
    }, {});

    const programIdsToPartnerIdsArray = Object.entries(
      programIdsToPartnerIds,
    ).map(([programId, partnerIds]) => ({
      programId,
      partnerIds,
    }));

    for (const { programId, partnerIds } of programIdsToPartnerIdsArray) {
      const program = await prisma.program.findUnique({
        where: {
          id: programId,
        },
        select: {
          name: true,
          holdingPeriodDays: true,
        },
      });

      if (!program) {
        continue;
      }

      // Find all due commissions for program
      const dueCommissionsForProgram = await prisma.commission.findMany({
        where: {
          status: "pending",
          programId,
          partnerId: {
            in: partnerIds,
          },
          // If there is a holding period set:
          // we only process commissions that were created before the holding period
          // but custom commissions are always included
          ...(program.holdingPeriodDays > 0
            ? {
                OR: [
                  {
                    type: "custom", // includes manual commissions + clawbacks
                  },
                  {
                    createdAt: {
                      lt: new Date(
                        Date.now() -
                          program.holdingPeriodDays * 24 * 60 * 60 * 1000,
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
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (dueCommissionsForProgram.length === 0) {
        console.log(
          `No due commissions found for program ${program.name}, skipping...`,
        );
        continue;
      }

      const partnerIdsToCommissions = dueCommissionsForProgram.reduce<
        Record<string, typeof dueCommissionsForProgram>
      >((acc, commission) => {
        if (!acc[commission.partnerId]) {
          acc[commission.partnerId] = [];
        }
        acc[commission.partnerId].push(commission);
        return acc;
      }, {});

      const partnerIdsToCommissionsArray = Object.entries(
        partnerIdsToCommissions,
      ).map(([partnerId, commissions]) => ({
        partnerId,
        commissions,
      }));

      const existingPendingPayouts = await prisma.payout.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToCommissionsArray.map((p) => p.partnerId),
          },
          status: "pending",
        },
      });

      console.log(
        `Processing ${partnerIdsToCommissionsArray.length} partners with due commissions for program ${program.name}...`,
      );
      let totalProcessed = 0;

      for (const { partnerId, commissions } of partnerIdsToCommissionsArray) {
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
          (p) => p.partnerId === partnerId,
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
              description: `Dub Partners payout (${program.name})`,
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

        // if we're reusing a pending payout, we need to update the amount
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
        (totalProcessed / partnerIdsToCommissionsArray.length) * 100;
      console.log(
        `Processed ${totalProcessed}/${partnerIdsToCommissionsArray.length} partners with due commissions for program ${program.name} (${successRate.toFixed(1)}% success rate)`,
      );
    }

    if (groupedCommissions.length === BATCH_SIZE) {
      const qstashResponse = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions`,
        body: {
          skip: skip + BATCH_SIZE,
        },
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
        `Processed payout commission aggregation for ${groupedCommissions.length} partner-program pairs. Scheduling next batch...`,
      );
    }

    return logAndRespond(
      `Completed all payout commission aggregation for ${groupedCommissions.length} partner-program pairs.`,
    );
  } catch (error) {
    await log({
      message: `Error aggregating commissions into payouts: ${error.message}`,
      type: "errors",
      mention: true,
    });
    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
