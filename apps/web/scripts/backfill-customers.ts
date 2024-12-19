import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { tb } from "../lib/tinybird/client";
import z from "../lib/zod";

export const getLeadEvents = tb.buildPipe({
  pipe: "get_lead_events",
  parameters: z.object({
    customerIds: z.array(z.string()),
  }),
  data: z.any(),
});

export const getClickEvents = tb.buildPipe({
  pipe: "get_click_events",
  parameters: z.object({
    clickIds: z.array(z.string()),
  }),
  data: z.any(),
});

// Backfill new customer columns such as linkId, clickId, country
async function main() {
  const where: Prisma.CustomerWhereInput = {
    linkId: null,
    projectId: {
      not: "clrei1gld0002vs9mzn93p8ik",
    },
  };

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
    },
    take: 200,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (customers.length === 0) {
    console.log("No customers left to update.");
    return;
  }

  // Find leads
  const customerIds = customers.map((customer) => customer.id);

  const leadEvents = await getLeadEvents({ customerIds }).then(
    (res) => res.data,
  );

  // Find clicks
  // We're fetching clicks, because leads doesn't have information about when click happened
  const clickIds = leadEvents
    .map((event) => event.click_id)
    .filter(Boolean) as string[];

  const clickEvents = await getClickEvents({ clickIds }).then(
    (res) => res.data,
  );

  // Update customers
  const result = await Promise.all(
    customers.map(async (customer) => {
      const leadEvent = leadEvents.find(
        (lead) => lead?.customer_id === customer.id,
      );

      const clickEvent = clickEvents.find(
        (click) => click?.click_id === leadEvent?.click_id,
      );

      if (!leadEvent || !clickEvent) {
        return customer;
      }

      return prisma.customer.update({
        where: { id: customer.id },
        data: {
          linkId: clickEvent.link_id,
          clickId: clickEvent.click_id,
          country: clickEvent.country,
          clickedAt: new Date(clickEvent.timestamp + "Z"),
        },
        select: {
          id: true,
          linkId: true,
          clickId: true,
          country: true,
          clickedAt: true,
        },
      });
    }),
  );

  const remaining = await prisma.customer.count({
    where,
  });

  console.table(result);
  console.log(`${remaining} remaining`);
}

main();

// '2024-12-17 13:48:52.533'
// new Date('2024-12-17 13:48:52.533')
