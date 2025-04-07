import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const where: Prisma.CommissionWhereInput = {
    earnings: 0,
    programId: "prog_xxx",
  };

  const commissions = await prisma.commission.findMany({
    where,
    take: 100,
  });

  const reward = await prisma.reward.findUniqueOrThrow({
    where: {
      id: "rw_xxx",
    },
  });

  const updatedCommissions = await Promise.all(
    commissions.map(async (commission) => {
      // Recalculate the earnings based on the new amount
      const earnings = calculateSaleEarnings({
        reward,
        sale: {
          amount: commission.amount,
          quantity: commission.quantity,
        },
      });

      return prisma.commission.update({
        where: { id: commission.id },
        data: {
          earnings,
        },
      });
    }),
  );
  console.table(updatedCommissions, [
    "id",
    "partnerId",
    "amount",
    "earnings",
    "createdAt",
  ]);

  const remainingCommissions = await prisma.commission.count({
    where,
  });
  console.log(`${remainingCommissions} commissions left to update`);
}

main();
