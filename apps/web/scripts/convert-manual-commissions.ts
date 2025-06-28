import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType, Prisma } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const manualPayouts = await prisma.payout.findMany({
    where: {
      periodStart: null,
      periodEnd: null,
    },
    include: {
      partner: true,
    },
  });

  console.table(manualPayouts);

  const manualCommissions: Prisma.CommissionCreateManyInput[] =
    manualPayouts.map((payout) => {
      return {
        id: createId({ prefix: "cm_" }),
        programId: payout.programId,
        partnerId: payout.partnerId,
        payoutId: payout.id,
        type: CommissionType.custom,
        amount: 0,
        quantity: 1,
        earnings: payout.amount,
        description: payout.description,
        status: CommissionStatus.processed,
        createdAt: payout.createdAt,
        updatedAt: new Date(),
      };
    });

  console.table(manualCommissions);

  // Add manual commissions to the database
  const createdCommissions = await prisma.commission.createMany({
    data: manualCommissions,
    skipDuplicates: true,
  });

  console.log({ createdCommissions });
}

main();
