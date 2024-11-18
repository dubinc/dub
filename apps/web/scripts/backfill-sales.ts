import { getEvents } from "@/lib/analytics/get-events";
import { createSaleData } from "@/lib/api/sales/sale";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import "dotenv-flow/config";

const enrollmentId = "cm2v7e3780000d1efwh8b63y5";

async function main() {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      id: enrollmentId,
    },
    select: {
      partnerId: true,
      program: true,
      link: {
        select: {
          id: true,
          domain: true,
          key: true,
          url: true,
          projectId: true,
          createdAt: true,
          tags: true,
        },
      },
    },
  });
  if (!programEnrollment?.link) {
    throw new Error("program enrollment not found");
  }

  const { partnerId, program, link } = programEnrollment;
  const { workspaceId } = program;

  const saleEvents = await getEvents({
    workspaceId,
    linkId: link.id,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    order: "desc",
    sortBy: "timestamp",
  });

  const data = saleEvents.map((e: z.infer<typeof saleEventResponseSchema>) => ({
    ...createSaleData({
      customerId: e.customer.id,
      linkId: e.link.id,
      clickId: e.click.id,
      invoiceId: e.invoice_id,
      eventId: e.eventId,
      paymentProcessor: e.payment_processor,
      amount: e.sale.amount,
      currency: "usd",
      partnerId,
      program,
      metadata: e.click,
    }),
    createdAt: new Date(e.timestamp),
  }));

  console.table(data.slice(0, 10));

  const response = await prisma.sale.createMany({
    data,
    skipDuplicates: true,
  });

  console.log({ response });
}

main();
