import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { getEvents } from "../lib/analytics/get-events";
import { includeTags } from "../lib/api/links/include-tags";
import { createSaleData } from "../lib/api/sales/create-sale-data";
import { recordLink } from "../lib/tinybird";
import { SaleEvent } from "../lib/types";

// script to backfill partner links (including sales events if present)
async function main() {
  const link = await prisma.link.update({
    where: {
      id: "link_xxx",
    },
    data: {
      folderId: "fold_xxx",
      programId: "prog_xxx",
      partnerId: "pn_xxx",
    },
    include: includeTags,
  });

  const result = await recordLink(link);

  console.log(link, result);

  // backfill commission events if the link has sales
  if (link.sales > 0 && link.partnerId && link.programId) {
    const saleEvents = await getEvents({
      programId: link.programId,
      partnerId: link.partnerId,
      event: "sales",
      interval: "all",
      page: 1,
      limit: 5000,
      sortOrder: "desc",
      sortBy: "timestamp",
    });

    const program = await prisma.program.findUnique({
      where: {
        id: link.programId,
      },
    });

    const data = saleEvents.map((e: SaleEvent) => ({
      ...createSaleData({
        program: program!,
        partner: {
          id: link.partnerId!,
          commissionAmount: null,
        },
        customer: {
          id: e.customer.id,
          linkId: e.link.id,
          clickId: e.click.id,
        },
        sale: {
          amount: e.sale.amount,
          currency: "usd",
          invoiceId: e.invoice_id,
          eventId: e.eventId,
          paymentProcessor: e.payment_processor,
        },
      }),
      createdAt: new Date(e.timestamp),
    }));

    console.table(data.slice(0, 10));

    const response = await prisma.commission.createMany({
      data,
      skipDuplicates: true,
    });

    console.log({ response });
  }
}

main();
