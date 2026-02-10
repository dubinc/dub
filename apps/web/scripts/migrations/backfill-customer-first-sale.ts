import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { tb } from "../../lib/tinybird/client";

export const getFirstSaleEvents = tb.buildPipe({
  pipe: "get_first_sale_events",
  parameters: z.object({
    customerIds: z.string().array(),
  }),
  data: z.object({
    customerId: z.string(),
    firstSaleAt: z.string(),
  }),
});

async function main() {
  while (true) {
    const customerWithSales = await prisma.customer.findMany({
      where: {
        sales: {
          gt: 0,
        },
        firstSaleAt: null,
      },
      take: 5000,
    });

    if (customerWithSales.length === 0) {
      console.log("No customers left to backfill");
      break;
    }

    let updated = 0;

    const chunks = chunk(customerWithSales, 100);

    for (const chunk of chunks) {
      const firstSaleEvents = await getFirstSaleEvents({
        customerIds: chunk.map((customer) => customer.id),
      }).then((res) => res.data);

      await Promise.all(
        chunk.map(async (customer) => {
          const firstSaleEvent = firstSaleEvents
            .filter((event) => event.customerId === customer.id)
            .sort(
              (a, b) =>
                new Date(a.firstSaleAt).getTime() -
                new Date(b.firstSaleAt).getTime(),
            )[0];

          if (!firstSaleEvent) {
            return;
          }
          try {
            await prisma.customer.update({
              where: { id: customer.id },
              data: {
                firstSaleAt: new Date(firstSaleEvent.firstSaleAt),
              },
            });
            updated++;
          } catch (_e) {}
        }),
      );

      console.log(
        `Updated ${updated}/${customerWithSales.length} customers (${(updated / customerWithSales.length) * 100}%)`,
      );
    }
  }
}

main();
