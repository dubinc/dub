import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// script to generate zero commissions for a program and partner
// useful for making sure a partner that's in a no reward group
// doesn't receive rewards for old referrals if they're moved to a reward group
async function main() {
  const programId = "prog_xxx";
  const partnerId = "pn_xxx";

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        programId,
        partnerId,
      },
    },
    include: {
      links: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  const customers = await prisma.customer.findMany({
    where: {
      programId,
      partnerId,
    },
  });

  const commissions = await prisma.commission.createMany({
    data: customers.map((customer) => ({
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId,
      linkId: programEnrollment.links[0].id,
      customerId: customer.id,
      rewardId: programEnrollment.saleRewardId,
      type: "sale",
      amount: 0,
      quantity: 1,
      earnings: 0,
      currency: "usd",
      status: "paid",
      createdAt: customer.createdAt,
    })),
  });

  console.log(`Created ${commissions.count} commissions`);
}

main();
