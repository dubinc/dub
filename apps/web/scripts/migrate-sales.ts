import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  // @ts-ignore (old sales table)
  const sales = await prisma.sale.findMany({
    select: {
      id: true,
      programId: true,
      partnerId: true,
      linkId: true,
      payoutId: true,
      invoiceId: true,
      customerId: true,
      eventId: true,
      amount: true,
      earnings: true,
      currency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 1000,
    skip: 2500,
  });

  if (!sales.length) {
    console.log("No sales found.");
    return;
  }

  await prisma.commission.createMany({
    data: sales.map((sale) => ({
      ...sale,
      id: createId({ prefix: "cm_" }),
      type: EventType.sale,
      quantity: 1,
    })),
    skipDuplicates: true,
  });

  console.log(`Migrated ${sales.length} sales.`);
}

main();
