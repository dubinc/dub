import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const where: Prisma.CommissionWhereInput = {
    programId: "prog_xxx",
    status: "pending",
    earnings: 0,
  };

  const commissions = await prisma.commission.findMany({
    where,
    take: 50,
  });

  const updatedCommissions = await Promise.all(
    commissions.map(async (commission) => {
      const reward = await determinePartnerReward({
        event: commission.type,
        partnerId: commission.partnerId,
        programId: commission.programId,
      });
      if (!reward) {
        return null;
      }
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
  const pendingCommissions = await prisma.commission.findMany({
    where: {
      ...where,
      earnings: undefined,
    },
  });
  console.log(
    `${pendingCommissions.reduce((acc, curr) => acc + curr.amount, 0)} amount`,
  );
  console.log(
    `${pendingCommissions.reduce((acc, curr) => acc + curr.earnings, 0)} earnings`,
  );
}

main();
