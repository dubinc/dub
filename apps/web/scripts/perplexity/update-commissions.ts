import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// update commissions for a program
async function main() {
  const where: Prisma.CommissionWhereInput = {
    programId: "prog_xxx",
    partnerId: "pn_xxx",
    status: "processed",
  };

  const remainingCommissions = await prisma.commission.findMany({
    where,
  });
  console.log(`${remainingCommissions.length} commissions to update`);

  const updatedRes = await prisma.commission.updateMany({
    where: {
      id: {
        in: remainingCommissions.map((c) => c.id),
      },
    },
    data: {
      earnings: 0,
    },
  });
  console.log(`${updatedRes.count} commissions updated`);
}

main();
