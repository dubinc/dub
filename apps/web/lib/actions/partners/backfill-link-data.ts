import { getEvents } from "@/lib/analytics/get-events";
import { includeTags } from "@/lib/api/links/include-tags";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-earnings";
import { createId } from "@/lib/api/utils";
import { determinePartnerReward } from "@/lib/partners/rewards";
import { recordLink } from "@/lib/tinybird";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { EventType } from "@prisma/client";

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

  const reward = await determinePartnerReward({
    programId,
    partnerId,
    event: "sale",
  });

  if (!reward) {
    return;
  }

  const { program, partner } = await prisma.programEnrollment.findUniqueOrThrow(
    {
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
    },
  );

  const { workspace } = program;

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
    id: createId({ prefix: "cm_" }),
    programId: program.id,
    partnerId: partner.id,
    linkId: linkId,
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

  if (data.length > 0) {
    await prisma.commission.createMany({
      data,
      skipDuplicates: true,
    });
  }
};
