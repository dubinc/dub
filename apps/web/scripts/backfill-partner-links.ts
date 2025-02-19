import { calculateSaleEarnings } from "@/lib/api/sales/calculate-earnings";
import { createId } from "@/lib/api/utils";
import { determinePartnerReward } from "@/lib/partners/rewards";
import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import "dotenv-flow/config";
import { getEvents } from "../lib/analytics/get-events";
import { includeTags } from "../lib/api/links/include-tags";
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

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: link.programId,
      },
    });

    const reward = await determinePartnerReward({
      programId: program.id,
      partnerId: link.partnerId,
      event: "sale",
    });

    if (!reward || reward.amount === 0) {
      console.log("No reward.", reward);
      return;
    }

    const data = saleEvents.map((e: SaleEvent) => ({
      id: createId({ prefix: "cm_" }),
      programId: program.id,
      partnerId: link.partnerId!,
      linkId: link.id,
      invoiceId: e.invoice_id || null,
      customerId: e.customer.id,
      eventId: e.eventId,
      amount: e.sale.amount,
      type: EventType.sale,
      quantity: 1,
      currency: "usd",
      createdAt: new Date(e.timestamp),
      earnings: calculateSaleEarnings({
        reward,
        sale: {
          quantity: 1,
          amount: e.sale.amount,
        },
      }),
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
