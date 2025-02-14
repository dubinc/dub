import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { getEvents } from "../lib/analytics/get-events";
import { createSaleData } from "../lib/api/sales/create-sale-data";
import { SaleEvent } from "../lib/types";

const linkId = "cm11kukmw002cv1mbz2pv4bvi";

async function main() {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      linkId,
    },
    select: {
      partnerId: true,
      programId: true,
      program: true,
    },
  });
  if (!programEnrollment) {
    throw new Error("program enrollment not found");
  }

  const { partnerId, programId, program } = programEnrollment;

  const saleEvents = await getEvents({
    programId,
    partnerId,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    sortOrder: "desc",
    sortBy: "timestamp",
  });

  const data = saleEvents.map((e: SaleEvent) => ({
    ...createSaleData({
      program,
      partner: {
        id: partnerId,
        commissionAmount: null,
      },
      customer: {
        id: e.customer.id,
        linkId: e.link.id,
        clickId: e.click.id,
      },
      sale: {
        invoiceId: e.invoice_id,
        eventId: e.eventId,
        paymentProcessor: e.payment_processor,
        amount: e.sale.amount,
        currency: "usd",
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

main();
