import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const where: Prisma.CommissionWhereInput = {
    programId: "prog_xxx",
    payoutId: {
      not: null,
    },
    status: "paid",
  };

  const payoutsToUpdate = await prisma.commission.groupBy({
    by: ["payoutId"],
    where,
    _count: true,
    orderBy: {
      _count: {
        payoutId: "desc",
      },
    },
  });

  for (const payout of payoutsToUpdate) {
    if (!payout.payoutId) {
      console.log(`No payout ID found for payout ${payout.payoutId}`);
      continue;
    }

    await prisma.commission.updateMany({
      where: {
        payoutId: payout.payoutId,
        status: "paid",
      },
      data: { payoutId: null },
    });

    const remainingCommissions = await prisma.commission.findMany({
      where: {
        payoutId: payout.payoutId,
      },
    });

    console.log(
      `Updated ${payout.payoutId} to have ${remainingCommissions.length} commissions`,
    );

    if (remainingCommissions.length === 0) {
      console.log(
        `No remaining commissions for payout ${payout.payoutId}, deleting payout`,
      );
      await prisma.payout.delete({
        where: { id: payout.payoutId },
      });
      continue;
    }

    await prisma.payout.update({
      where: { id: payout.payoutId },
      data: {
        amount: remainingCommissions.reduce(
          (acc, commission) => acc + commission.earnings,
          0,
        ),
      },
    });
  }
}

main();
