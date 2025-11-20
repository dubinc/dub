// @ts-nocheck some weird typing issues below

import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { getEvents } from "../../lib/analytics/get-events";

async function main() {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: "link_xxx",
    },
  });
  const leadEvents = await getEvents({
    event: "leads",
    interval: "all",
    workspaceId: link.projectId!,
    linkId: link.id,
    sortBy: "timestamp",
    page: 1,
    limit: 1000,
  });

  const commissionsToCreate: Prisma.CommissionCreateManyInput[] = leadEvents
    .filter((e) => e.event === "lead")
    .map((e) => ({
      id: createId({ prefix: "cm_" }),
      programId: link.programId!,
      partnerId: link.partnerId!,
      rewardId: "rw_xxx",
      customerId: e.customer!.id,
      linkId: link.id,
      eventId: e.eventId,
      type: "lead",
      quantity: 1,
      amount: 0,
      currency: "usd",
      earnings: 2000,
      status: "pending",
      createdAt: new Date(e.timestamp),
    }));

  console.table(commissionsToCreate);

  await prisma.commission.createMany({
    data: commissionsToCreate,
    skipDuplicates: true,
  });
  console.log(`Created ${commissionsToCreate.length} commissions`);
}

main();
