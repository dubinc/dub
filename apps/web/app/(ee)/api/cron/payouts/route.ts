import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { endOfMonth } from "date-fns";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to aggregate pending commissions
// that are past the program holding period into a single payout.
// Runs once every hour (0 * * * *)
// GET /api/cron/payouts
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const groupedCommissions = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        status: "pending",
        payoutId: null,
      },
    });

    if (!groupedCommissions.length) {
      return NextResponse.json({
        message: "No pending commissions found. Skipping...",
      });
    }

    console.log(
      `Found ${groupedCommissions.length} pending commissions to process.`,
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
          partners: {
            where: {
              partnerId: {
                in: partnerIds,
              },
            },
          },
        },
      });

      if (!program) {
        continue;
      }

      const { name, holdingPeriodDays, partners } = program;

      const bannedPartners = partners.filter(
        (partner) => partner.status === "banned",
      );
      const updatedBannedCommissions = await prisma.commission.updateMany({
        where: {
          earnings: {
            gt: 0,
          },
          programId,
          partnerId: {
            in: bannedPartners.map(({ partnerId }) => partnerId),
          },
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      });
      if (updatedBannedCommissions.count > 0) {
        console.log(
          `Updated ${updatedBannedCommissions.count} banned commissions for program ${name} to canceled`,
        );
      }

      // Find all pending commissions
      const pendingCommissionsForProgram = await prisma.commission.findMany({
        where: {
          status: "pending",
          programId,
          // If there is a holding period set:
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
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (pendingCommissionsForProgram.length === 0) {
        continue;
      }

      const partnerIdsToCommissions = pendingCommissionsForProgram.reduce<
        Record<string, typeof pendingCommissionsForProgram>
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

        // end of the month of the latest commission date
        // e.g. if the latest sale is 2024-12-16, the periodEnd should be 2024-12-31
        const periodEnd = endOfMonth(
          sortedCommissions[sortedCommissions.length - 1].createdAt,
        );

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
          console.log(
            `No existing payout found, created new one ${payoutToUse.id} for partner ${partnerId}`,
          );
        }

        const updatedCommissions = await prisma.commission.updateMany({
          where: {
            id: { in: commissions.map((c) => c.id) },
          },
          data: {
            status: "processed",
            payoutId: payoutToUse.id,
          },
        });
        console.log(
          `Updated ${updatedCommissions.count} commissions to have payoutId ${payoutToUse.id}`,
        );

        // if we're reusing a pending payout, we need to update the amount
        if (existingPendingPayouts.find((p) => p.id === payoutToUse.id)) {
          const updatedPayout = await prisma.payout.update({
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
          console.log(
            `Since we're reusing payout ${payoutToUse.id}, add the new earnings of ${totalEarnings} to the payout amount, making it ${updatedPayout.amount}`,
          );
        }
      }
    }

    return NextResponse.json({
      message: "Commissions payout created.",
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
