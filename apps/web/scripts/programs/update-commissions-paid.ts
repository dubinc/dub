import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const commissionIdList: string[] = [];

async function main() {
  const commissions = await prisma.commission.findMany({
    where: {
      id: {
        in: commissionIdList,
      },
      status: "processed",
      payout: {
        status: "pending",
      },
    },
  });

  if (commissions.length === 0) {
    console.log("No commissions to update");
    return;
  }

  console.log(`Found ${commissions.length} commissions to update`);
  console.table(commissions, [
    "id",
    "partnerId",
    "amount",
    "earnings",
    "status",
    "createdAt",
  ]);

  const payoutIdsToRetally = [
    ...new Set(
      commissions
        .filter((commission) => commission.payoutId)
        .map((commission) => commission.payoutId!),
    ),
  ];

  const updatedCommissions = await prisma.commission.updateMany({
    where: {
      id: {
        in: commissions.map((commission) => commission.id),
      },
    },
    data: {
      payoutId: null,
      status: "paid",
    },
  });

  for (const payoutId of payoutIdsToRetally) {
    const data = await prisma.commission.aggregate({
      _sum: {
        earnings: true,
      },
      where: {
        payoutId,
      },
    });
    const payoutAmount = data._sum.earnings ?? 0;
    if (payoutAmount === 0) {
      console.log(`Deleting payout ${payoutId}`);
      await prisma.payout.delete({
        where: {
          id: payoutId,
        },
      });
    } else {
      console.log(`Updating payout ${payoutId} with amount ${payoutAmount}`);
      await prisma.payout.update({
        where: {
          id: payoutId,
        },
        data: {
          amount: payoutAmount,
        },
      });
    }
  }

  console.log(
    `Updated ${updatedCommissions.count} commissions to have status "paid"`,
  );
}

main();
