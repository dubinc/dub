import { getEvents } from "@/lib/analytics/get-events";
import { createSaleData } from "@/lib/api/sales/create-sale-data";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";

export const backfillLinkData = async ({
  programEnrollmentId,
  linkId,
}: {
  programEnrollmentId: string;
  linkId: string;
}) => {
  const alreadyBackfilled = await prisma.sale.count({
    where: {
      linkId,
    },
  });

  if (alreadyBackfilled > 0) {
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      id: programEnrollmentId,
    },
    include: {
      program: {
        include: {
          workspace: true,
        },
      },
      partner: true,
    },
  });

  const { program, partner, commissionAmount } = programEnrollment;
  const workspace = program.workspace;

  const saleEvents = await getEvents({
    workspaceId: workspace.id,
    linkId,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    order: "desc",
    sortBy: "timestamp",
  });

  const data = saleEvents.map((e: SaleEvent) => ({
    ...createSaleData({
      program,
      partner: {
        id: partner.id,
        commissionAmount,
      },
      customer: {
        id: e.customer.id,
        clickId: e.click.id,
        linkId: e.link.id,
      },
      sale: {
        invoiceId: e.invoice_id,
        eventId: e.eventId,
        paymentProcessor: e.payment_processor,
        amount: e.sale.amount,
        currency: "usd",
      },
      metadata: e.click,
    }),
    createdAt: new Date(e.timestamp),
  }));

  if (data.length > 0) {
    await prisma.sale.createMany({
      data,
      skipDuplicates: true,
    });
  }
};
