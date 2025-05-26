import { createId } from "@/lib/api/create-id";
import {
  CUTOFF_PERIOD,
  CUTOFF_PERIOD_TYPES,
} from "@/lib/partners/cutoff-period";
import { prisma } from "@dub/prisma";
import { Program } from "@prisma/client";
import { endOfMonth } from "date-fns";

export async function splitPayouts({
  program,
  cutoffPeriod,
}: {
  program: Pick<Program, "id" | "minPayoutAmount">;
  cutoffPeriod: CUTOFF_PERIOD_TYPES;
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

  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )!.value;

  for (const payout of payouts) {
    const previousCommissions = payout.commissions
      .filter((commission) => {
        return commission.createdAt < cutoffPeriodValue;
      })
      .sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const currentCommissions = payout.commissions
      .filter((commission) => {
        return commission.createdAt >= cutoffPeriodValue;
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
      await prisma.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          periodEnd: endOfMonth(
            previousCommissions[previousCommissionsCount - 1].createdAt,
          ),
          amount: previousCommissions.reduce(
            (total, commission) => total + commission.earnings,
            0,
          ),
        },
      });

      if (currentCommissionsCount > 0) {
        const currentMonthPayout = await prisma.payout.create({
          data: {
            id: createId({ prefix: "po_" }),
            programId: program.id,
            partnerId: payout.partnerId,
            periodStart: currentCommissions[0].createdAt,
            periodEnd: endOfMonth(
              currentCommissions[currentCommissions.length - 1].createdAt,
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
