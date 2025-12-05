import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { getEvents } from "../../lib/analytics/get-events";
import { createId } from "../../lib/api/create-id";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { calculateSaleEarnings } from "../../lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "../../lib/partners/determine-partner-reward";
import { SaleEvent } from "../../lib/types";

// script to backfill link commissions
// NOTE: need to remove "server-only" from serialize-reward.ts to run this script
async function main() {
  const linkId = "link_1K51TBZPWY2WB401DTJHQBTZ3";
  const eventId = "Y9SMlkLFt9gt63fl";

  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
  });
  if (!link.partnerId || !link.programId) {
    throw new Error("Link does not have a partner or program");
  }

  const saleEvents = (await getEvents({
    linkId: link.id,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    sortOrder: "desc",
    sortBy: "timestamp",
  })) as SaleEvent[];

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId: link.partnerId,
        programId: link.programId,
      },
    },
    include: {
      program: true,
      partner: true,
      links: true,
      saleReward: true,
    },
  });

  const { program } = programEnrollment;

  const data = saleEvents
    .map((e) => {
      if (e.eventId !== eventId) {
        return null;
      }
      const reward = determinePartnerReward({
        event: "sale",
        programEnrollment,
        context: {
          sale: {
            productId: e.metadata?.productId,
          },
        },
      });
      if (!reward) {
        return null;
      }
      return {
        id: createId({ prefix: "cm_" }),
        programId: program.id,
        partnerId: link.partnerId!,
        linkId: link.id,
        invoiceId: e.invoice_id
          ? `${e.invoice_id}${e.metadata?.productId ? `-${e.metadata?.productId}` : ""}`
          : null,
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
      };
    })
    .filter(
      (c): c is NonNullable<typeof c> => c !== null,
    ) satisfies Prisma.CommissionCreateManyInput[];

  console.table(data);

  // create commissions
  const res = await prisma.commission.createMany({
    data,
    skipDuplicates: true,
  });
  console.log(`Created ${res.count} commissions`);

  // sync total commissions for the partner in the program
  await syncTotalCommissions({
    partnerId: link.partnerId,
    programId: link.programId,
  });
}

main();
