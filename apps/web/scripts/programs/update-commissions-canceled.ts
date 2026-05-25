import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";

async function main() {
  const programId = "prog_xxx";

  const commissions = await prisma.commission.findMany({
    where: {
      programId,
      partnerId: "pn_xxx",
      status: {
        in: ["pending", "processed"],
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
      status: "canceled",
    },
  });

  console.log(
    `Updated ${updatedCommissions.count} commissions to have status "canceled"`,
  );

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
  const partnerIdsToRetally = [
    ...new Set(commissions.map((commission) => commission.partnerId)),
  ];

  for (const partnerId of partnerIdsToRetally) {
    await syncTotalCommissions({
      partnerId,
      programId,
    });
  }
}

main();
