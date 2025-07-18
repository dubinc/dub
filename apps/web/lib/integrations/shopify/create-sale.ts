import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import z from "@/lib/zod";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { orderSchema } from "./schema";

export async function createShopifySale({
  event,
  customerId,
  workspaceId,
  leadData,
}: {
  event: any;
  customerId: string;
  workspaceId: string;
  leadData: z.infer<typeof leadEventSchemaTB>;
}) {
  const order = orderSchema.parse(event);

  const {
    checkout_token: checkoutToken,
    confirmation_number: invoiceId,
    current_subtotal_price_set: { shop_money: shopMoney },
  } = order;

  const amount = Math.round(Number(shopMoney.amount) * 100); // round to nearest cent
  const { link_id: linkId } = leadData;
  const currency = shopMoney.currency_code.toLowerCase();

  // Skip if invoice id is already processed
  const ok = await redis.set(
    `dub_sale_events:linkId:${linkId}:invoiceId:${invoiceId}`,
    1,
    {
      ex: 60 * 60 * 24 * 7,
      nx: true,
    },
  );

  if (!ok) {
    return new Response(
      `[Shopify] Order has been processed already. Skipping...`,
    );
  }

  const saleData = {
    ...leadData,
    event_id: nanoid(16),
    event_name: "Purchase",
    payment_processor: "shopify",
    amount,
    currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify(order),
  };

  const [_sale, link, workspace, customer] = await Promise.all([
    // record sale
    recordSale(saleData),

    // update link sales count
    prisma.link.update({
      where: {
        id: linkId,
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

    // update workspace sales usage
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),

    prisma.customer.update({
      where: {
        id: customerId,
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

    redis.del(`shopify:checkout:${checkoutToken}`),
  ]);

  waitUntil(
    sendWorkspaceWebhook({
      trigger: "sale.created",
      workspace,
      data: transformSaleEventData({
        ...saleData,
        link,
        clickedAt: customer.clickedAt || customer.createdAt,
        customer,
      }),
    }),
  );

  // for program links
  if (link.programId && link.partnerId) {
    const commission = await createPartnerCommission({
      event: "sale",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId: saleData.event_id,
      customerId: customer.id,
      amount: saleData.amount,
      quantity: 1,
      invoiceId: saleData.invoice_id,
      currency: saleData.currency,
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
}
