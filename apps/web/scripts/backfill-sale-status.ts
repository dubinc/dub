import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordSale } from "../lib/tinybird";
import { getSaleEvent } from "../lib/tinybird/get-sale-event";

async function main() {
  const sales = await prisma.sale.findMany({
    take: 10,
    skip: 0,
  });

  if (sales.length === 0) {
    console.error("No sales found.");
    return;
  }

  const response = await Promise.all(
    sales.map((sale) =>
      getSaleEvent({
        eventId: sale.eventId,
      }),
    ),
  );

  const saleEvents = response.map((r) => r.data[0]);

  const toUpdate = sales.map((sale) => {
    const saleEvent = saleEvents.find((se) => se.event_id === sale.eventId);

    return {
      ...saleEvent,
      status: sale.status,
    };
  });

  // Backfill sale status in Tinybird
  // @ts-ignore
  const { successful_rows, quarantined_rows } = await recordSale(toUpdate);

  console.log(`Backfilled sales`, { successful_rows, quarantined_rows });
}

main();
