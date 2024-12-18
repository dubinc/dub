import "dotenv-flow/config";
import { getClickEvent, getLeadEvent } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";


// Backfill new customer columns such as linkId, clickId, country

// linkId           String?
//   clickId          String?
//   clickedAt        DateTime?
//   leadCreatedAt    DateTime?
//   country          String?

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      // linkId: null,
    },
    select: {
      id: true,
    },
    take: 1,
  });

  if (customers.length === 0) {
    console.log("No customers left to update.");
    return;
  }

  // Find leads
  const leadResponse = await Promise.all(
    customers.map((customer) => getLeadEvent({ customerId: customer.id })),
  );

  const leadEvents = leadResponse.map((event) =>
    event.data.length > 0 ? event.data[0] : undefined,
  );

  // Find clicks
  // We're fetching clicks, because leads doesn't have information about when click happened
  const clickResponse = await Promise.all(
    leadEvents.map((event) => getClickEvent({ clickId: event?.click_id! })),
  );

  const clickEvents = clickResponse.map((event) =>
    event.data.length > 0 ? event.data[0] : undefined,
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

      console.log(leadEvent, clickEvent);

      if (!leadEvent || !clickEvent) {
        return;
      }

      return prisma.customer.update({
        where: { id: customer.id },
        data: {
          linkId: leadEvent.link_id,
          clickId: leadEvent.click_id,
          country: leadEvent.country,
          clickedAt: clickEvent.timestamp,
          leadCreatedAt: null,
        },
        select: {
          id: true,
          linkId: true,
          clickId: true,
          country: true,
          clickedAt: true,
          leadCreatedAt: true,
        },
      });
    }),
  );

  const remaining = await prisma.customer.count({
    where: {
      linkId: null,
    },
  });

  console.table(result);
  console.log(`${remaining} remaining`);
}

main();


// '2024-12-17 13:48:52.533'
// new Date('2024-12-17 13:48:52.533')