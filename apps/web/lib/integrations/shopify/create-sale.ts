import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createSaleData } from "@/lib/api/sales/create-sale-data";
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

  const currency = shopMoney.currency_code.toLowerCase();
  const amount = Number(shopMoney.amount) * 100;

  const eventId = nanoid(16);
  const paymentProcessor = "shopify";
  const { link_id: linkId, click_id: clickId } = leadData;

  const sale = await prisma.sale.findFirst({
    where: {
      invoiceId,
      clickId,
    },
  });

  if (sale) {
    return new Response(
      `[Shopify] Order has been processed already. Skipping...`,
    );
  }

  const saleData = {
    ...leadData,
    event_id: eventId,
    event_name: "Purchase",
    payment_processor: paymentProcessor,
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
        salesUsage: {
          increment: amount,
        },
      },
    }),

    prisma.customer.findUniqueOrThrow({
      where: {
        id: customerId,
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
        customerId: customer.id,
        customerExternalId: customer.externalId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
        customerCreatedAt: customer.createdAt,
      }),
    }),
  );

  // for program links
  if (link.programId) {
    const { program, partnerId, commissionAmount } =
      await prisma.programEnrollment.findFirstOrThrow({
        where: {
          links: {
            some: {
              id: linkId,
            },
          },
        },
        select: {
          program: true,
          partnerId: true,
          commissionAmount: true,
        },
      });

    const saleRecord = createSaleData({
      program,
      partner: {
        id: partnerId,
        commissionAmount,
      },
      customer: {
        id: customerId,
        linkId,
        clickId,
      },
      sale: {
        amount,
        currency,
        invoiceId,
        eventId,
        paymentProcessor,
      },
      metadata: order,
    });

    waitUntil(
      Promise.allSettled([
        prisma.sale.create({
          data: saleRecord,
        }),

        notifyPartnerSale({
          partner: {
            id: partnerId,
            referralLink: link.shortLink,
          },
          program,
          sale: {
            amount: saleRecord.amount,
            earnings: saleRecord.earnings,
          },
        }),
      ]),
    );
  }
}
