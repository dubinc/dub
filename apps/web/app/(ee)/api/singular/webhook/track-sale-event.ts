import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { ClickEventTB } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";

export const trackSingularSaleEvent = async ({
  clickData,
  link,
}: {
  clickData: ClickEventTB;
  link: Link;
}) => {
  const eventQuantity = 1;
  const eventId = nanoid(16);
  const body = {};
  const customer = {
    id: "xxx",
  };
  const amount = 100;

  // TODO:
  // Record sale
  // Send "sale.created" webhook
  // Notify partner sale

  await Promise.allSettled([
    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
      },
      include: includeTags,
    }),

    prisma.project.update({
      where: {
        id: link.projectId!,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),

    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
      },
    }),

    logConversionEvent({
      workspace_id: link.projectId!,
      link_id: link.id,
      path: "/track/sale",
      body: JSON.stringify(body),
    }),
  ]);

  if (link.programId && link.partnerId && customer) {
    const commission = await createPartnerCommission({
      event: "sale",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId,
      customerId: customer.id,
      amount,
      quantity: 1,
      invoiceId: "xxx",
      currency: "usd",
    });

    if (commission) {
      waitUntil(
        notifyPartnerSale({
          link,
          commission,
        }),
      );
    }
  }
};
