import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_";

  const manualPayouts = await prisma.payout.findMany({
    where: {
      programId,
      status: "pending",
      periodStart: null,
      periodEnd: null,
    },
    include: {
      partner: true,
    },
  });

  let groupedPayouts: {
    partnerId: string;
    partnerName: string;
    programId: string;
    amount: number;
  }[] = [];

  for (const payout of manualPayouts) {
    const existingPayout = groupedPayouts.find(
      (group) => group.partnerId === payout.partnerId,
    );

    if (!existingPayout) {
      groupedPayouts.push({
        partnerName: payout.partner.name,
        partnerId: payout.partnerId,
        programId: payout.programId,
        amount: payout.amount,
      });
    } else {
      existingPayout.amount += payout.amount;
    }
  }

  if (groupedPayouts.length === 0) {
    console.log("No manual payouts found.");
    return;
  }

  console.table(groupedPayouts);

  const manualCommissions = groupedPayouts.map((payout) => {
    return {
      id: createId({ prefix: "cm_" }),
      programId: payout.programId,
      partnerId: payout.partnerId,
      type: CommissionType.custom,
      amount: 0,
      quantity: 1,
      earnings: payout.amount,
      status: CommissionStatus.pending,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  console.table(manualCommissions);

  await prisma.commission.createMany({
    data: manualCommissions,
    skipDuplicates: true,
  });
}

main();
