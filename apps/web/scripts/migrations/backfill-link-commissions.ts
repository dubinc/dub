import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { EventType, Prisma } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";
import { getEvents } from "../../lib/analytics/get-events";
import { createId } from "../../lib/api/create-id";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { calculateSaleEarnings } from "../../lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "../../lib/partners/determine-partner-reward";

// script to backfill link commissions
// NOTE: need to remove "server-only" from serialize-reward.ts to run this script
async function main() {
  const linkId = "link_xxx";
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
  });
  if (!link.partnerId || !link.programId) {
    throw new Error("Link does not have a partner or program");
  }

  const saleEvents = (await getEvents({
    workspaceId: link.projectId!,
    linkId: link.id,
    event: "sales",
    saleType: "new",
    page: 1,
    limit: 10000,
    sortOrder: "desc",
    sortBy: "timestamp",
    start: new Date("2026-01-01"),
    end: new Date("2026-03-06"),
  })) as SaleEvent[];

  const existingCommissions = await prisma.commission.findMany({
    where: {
      OR: [
        {
          eventId: {
            in: saleEvents.map((e) => e.eventId),
          },
        },
        {
          invoiceId: {
            in: saleEvents.map((e) => e.invoice_id),
          },
        },
        {
          customerId: {
            in: saleEvents.map((e) => e.customer.id),
          },
        },
      ],
    },
  });
  const missedSaleEvents = saleEvents.filter(
    (e) =>
      e.saleAmount > 20_00 && // special condition for program
      !existingCommissions.some(
        (c) =>
          c.eventId === e.eventId ||
          c.invoiceId === e.invoice_id ||
          c.customerId === e.customer.id,
      ),
  );

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

  const data = missedSaleEvents
    .map((e) => {
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
        invoiceId: e.invoice_id,
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

  console.table(data, [
    "customerId",
    "amount",
    "earnings",
    "invoiceId",
    "createdAt",
  ]);

  // create commissions
  const res = await prisma.commission.createMany({
    data,
    skipDuplicates: true,
  });
  console.log(
    `Backfilled ${res.count} commissions for a total of ${currencyFormatter(res.count * 20_00)}`,
  );

  // sync total commissions for the partner in the program
  await syncTotalCommissions({
    partnerId: link.partnerId,
    programId: link.programId,
  });
}

main();
