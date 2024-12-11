import { getLeadEvent } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      linkId: null,
    },
    select: {
      id: true,
    },
    take: 100,
  });

  if (customers.length === 0) {
    console.log("No customers left to update.");
    return;
  }

  const results = await Promise.all(
    customers.map(async (customer) =>
      getLeadEvent({ customerId: customer.id }),
    ),
  );

  const leadEvents = results.map((event) =>
    event.data.length > 0 ? event.data[0] : undefined,
  );

  const updatedCustomers = await Promise.all(
    leadEvents.map(async (event) => {
      if (!event) {
        return;
      }

      return await prisma.customer.update({
        where: { id: event.customer_id },
        data: {
          linkId: event.link_id,
          clickId: event.click_id,
          country: event.country,
          // TODO:
          // Update other columns
        },
        select: {
          id: true,
          linkId: true,
          clickId: true,
          country: true,
        },
      });
    }),
  );

  const remaining = await prisma.customer.count({
    where: {
      linkId: null,
    },
  });

  console.table(updatedCustomers);
  console.log(`${remaining} remaining`);
}

main();
