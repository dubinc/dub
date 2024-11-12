import { getEvents } from "@/lib/analytics/get-events";
import { createSaleData } from "@/lib/api/sales/sale";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import "dotenv-flow/config";

const workspaceId = "ws_cl7pj5kq4006835rbjlt2ofka";
const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";
const programId = "prog_d8pl69xXCv4AoHNT281pHQdo";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
  });

  const saleEvents = await getEvents({
    workspaceId,
    linkId: "clyp8srr900017c6xrkcv28la",
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    order: "desc",
    sortBy: "timestamp",
  });

  const data = saleEvents.map((e: z.infer<typeof saleEventResponseSchema>) =>
    createSaleData({
      customerId: e.customer.id,
      linkId: e.link.id,
      clickId: e.click.id,
      invoiceId: e.invoice_id,
      eventId: e.eventId,
      paymentProcessor: e.payment_processor,
      amount: e.sale.amount,
      currency: "usd",
      programEnrollment: {
        program,
        partnerId,
      } as any,
      metadata: e.click,
    }),
  );

  console.table(data.slice(0, 10));

  const response = await prisma.sale.createMany({
    data,
  });

  console.log({ response });
}

main();
