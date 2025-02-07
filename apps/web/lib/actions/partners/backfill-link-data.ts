import { getEvents } from "@/lib/analytics/get-events";
import { includeTags } from "@/lib/api/links/include-tags";
import { createSaleData } from "@/lib/api/sales/create-sale-data";
import { recordLink } from "@/lib/tinybird";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";

export const backfillLinkData = async ({
  programId,
  partnerId,
  linkId,
}: {
  programId: string;
  partnerId: string;
  linkId: string;
}) => {
  const link = await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      partnerId,
    },
    include: includeTags,
  });

  // update in tinybird
  await recordLink(link);

  if (link.sales === 0) {
    console.log(`Link ${linkId} has no sales, skipping backfill`);
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
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
    sortOrder: "desc",
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
    }),
    createdAt: new Date(e.timestamp),
  }));

  if (data.length > 0) {
    await prisma.commission.createMany({
      data,
      skipDuplicates: true,
    });
  }
};
