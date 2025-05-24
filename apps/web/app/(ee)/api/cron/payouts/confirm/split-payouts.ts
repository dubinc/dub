import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Program } from "@prisma/client";

export async function splitPayouts({
  program,
}: {
  program: Pick<Program, "id" | "minPayoutAmount">;
}) {
  const payouts = await prisma.payout.findMany({
    where: {
      programId: program.id,
      status: "pending",
      invoiceId: null,
      amount: {
        gte: program.minPayoutAmount,
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
      },
      periodStart: {
        not: null, // exclude the manual payouts
      },
    },
    include: {
      commissions: true,
    },
  });

  if (payouts.length === 0) {
    return;
  }

  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  for (const payout of payouts) {
    const previousCommissions = payout.commissions
      .filter((commission) => {
        return commission.createdAt < currentMonthStart;
      })
      .sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const currentCommissions = payout.commissions
      .filter((commission) => {
        return commission.createdAt >= currentMonthStart;
      })
      .sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const previousCommissionsCount = previousCommissions.length;
    const currentCommissionsCount = currentCommissions.length;

    // If there are previous commissions, we need to split the payout into two
    // 1 - one for everything up until the end of the previous month
    // 2 - everything else in the current month will be left as pending (and excluded from the payout)
    if (previousCommissionsCount > 0) {
      const periodEnd =
        previousCommissions[previousCommissionsCount - 1].createdAt;

      await prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          periodEnd: new Date(
            periodEnd.getFullYear(),
            periodEnd.getMonth() + 1,
          ),
          amount: previousCommissions.reduce(
            (total, commission) => total + commission.earnings,
            0,
          ),
        },
      });

      if (currentCommissionsCount > 0) {
        const periodEnd =
          currentCommissions[currentCommissions.length - 1].createdAt;

        const currentMonthPayout = await prisma.payout.create({
          data: {
            id: createId({ prefix: "po_" }),
            programId: program.id,
            partnerId: payout.partnerId,
            periodStart: currentCommissions[0].createdAt,
            periodEnd: new Date(
              periodEnd.getFullYear(),
              periodEnd.getMonth() + 1,
            ),
            amount: currentCommissions.reduce(
              (total, commission) => total + commission.earnings,
              0,
            ),
            description: "Dub Partners payout",
          },
        });

        await prisma.commission.updateMany({
          where: {
            id: {
              in: currentCommissions.map((commission) => commission.id),
            },
          },
          data: {
            payoutId: currentMonthPayout.id,
          },
        });
      }
    }
  }
}
