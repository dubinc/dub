import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const partnerId = "pn_1K2J9DRWPPJ2F1RX53N92TSGG";

  const commissions: Prisma.CommissionCreateManyInput[] = [
    {
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId,
      type: "referral",
      amount: 0,
      quantity: 1,
      earnings: 10000,
      createdAt: new Date(),
    },
    {
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId,
      type: "referral",
      amount: 0,
      quantity: 1,
      earnings: 20000,
      createdAt: new Date(),
    },
  ];

  const response = await prisma.commission.createMany({
    data: commissions,
    skipDuplicates: true,
  });

  console.log(response);
}

main();
