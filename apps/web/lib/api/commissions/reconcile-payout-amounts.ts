import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";

export async function reconcilePayoutAmounts(payoutIds: string[]) {
  const uniquePayoutIds = [...new Set(payoutIds)];

  if (uniquePayoutIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const aggregates = await tx.commission.groupBy({
      by: ["payoutId"],
      where: {
        payoutId: {
          in: uniquePayoutIds,
        },
      },
      _sum: {
        earnings: true,
      },
    });

    const sumByPayoutId = new Map(
      aggregates.map((a) => [a.payoutId!, a._sum.earnings ?? 0]),
    );

    const toDelete: string[] = [];
    const toUpdate: { id: string; amount: number }[] = [];

    for (const id of uniquePayoutIds) {
      const newPayoutAmount = sumByPayoutId.get(id) ?? 0;

      if (newPayoutAmount === 0) {
        toDelete.push(id);
      } else {
        toUpdate.push({ id, amount: newPayoutAmount });
      }
    }

    if (toDelete.length > 0) {
      await tx.payout.deleteMany({
        where: {
          id: {
            in: toDelete,
          },
          status: {
            in: MUTABLE_PAYOUT_STATUSES,
          },
        },
      });
    }

    await Promise.all(
      toUpdate.map(({ id, amount }) =>
        tx.payout.update({
          where: {
            id,
            status: {
              in: MUTABLE_PAYOUT_STATUSES,
            },
          },
          data: {
            amount,
          },
        }),
      ),
    );

    for (const id of toDelete) {
      console.log(
        `[reconcilePayoutAmount] Deleted payout ${id} because it has no commissions.`,
      );
    }

    for (const { id, amount } of toUpdate) {
      console.log(
        `[reconcilePayoutAmount] Updated payout amount for payout ${id} to ${amount}`,
      );
    }
  });
}
