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
  const customerWithSales = await prisma.customer.findMany({
    where: {
      sales: {
        gt: 0,
      },
      firstSaleAt: null,
    },
    take: 5000,
  });

  let updated = 0;

  const chunks = chunk(customerWithSales, 50);

  for (const chunk of chunks) {
    const firstSaleEvents = await getFirstSaleEvents({
      customerIds: chunk.map((customer) => customer.id),
    }).then((res) => res.data);

    await Promise.all(
      firstSaleEvents.map(async (event) => {
        const res = await prisma.customer.update({
          where: { id: event.customerId },
          data: {
            firstSaleAt: new Date(event.firstSaleAt),
          },
        });
        console.log({
          id: res.id,
          firstSaleAt: res.firstSaleAt,
        });
        updated++;
      }),
    );
  }

  console.log(
    `Updated ${updated}/${customerWithSales.length} customers (${(updated / customerWithSales.length) * 100}%)`,
  );
}

main();
