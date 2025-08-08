import { prisma } from "@dub/prisma";
import { endOfMonth } from "date-fns";
import "dotenv-flow/config";

const payoutToMergeFrom = "po_1JZ3EXF4BDFGY9N6KF7BD4W38";
const payoutToMergeTo = "po_1JT0FW1SBKW7R88FKDENC9N9N";

async function main() {
  const commissions = await prisma.commission.findMany({
    where: {
      payoutId: payoutToMergeFrom,
    },
  });

  console.log(`Found ${commissions.length} commissions`);

  const latestCommission = endOfMonth(
    commissions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0].createdAt,
  );

  console.log(`Latest commission: ${latestCommission}`);

  const updatedCommisions = await prisma.commission.updateMany({
    where: {
      payoutId: payoutToMergeFrom,
    },
    data: {
      payoutId: payoutToMergeTo,
    },
  });

  console.log(`Updated ${updatedCommisions.count} commissions`);

  const result = await prisma.commission.aggregate({
    where: {
      payoutId: payoutToMergeTo,
    },
    _sum: {
      earnings: true,
    },
  });

  console.log(`Sum of commissions: ${result._sum.earnings}`);

  const updatedPayout = await prisma.payout.update({
    where: {
      id: payoutToMergeTo,
    },
    data: {
      amount: result._sum.earnings ?? 0,
      periodEnd: latestCommission,
    },
  });

  console.log(`Updated payout: ${JSON.stringify(updatedPayout, null, 2)}`);

  const deletedPayout = await prisma.payout.delete({
    where: {
      id: payoutToMergeFrom,
    },
  });

  console.log(`Deleted payout: ${deletedPayout.id}`);
}

main();
