import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@/lib/prisma";
import { recordSale } from "@/lib/tinybird";
import { LeadEventTB } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { shopifyCheckoutCache } from "./checkout-cache";
import { ShopifyError } from "./error";
import { ShopifyOrder } from "./schema";

export async function createShopifySale({
  order,
  customerId,
  workspaceId,
  leadData,
}: {
  order: ShopifyOrder;
  customerId: string;
  workspaceId: string;
  leadData: LeadEventTB;
}) {
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
    throw new ShopifyError(
      "Sale event for this order has been processed already. Skipping the order...",
    );
  }

  const saleData = {
    ...leadData,
    workspace_id: workspaceId,
    event_id: nanoid(16),
    event_name: "Purchase",
    payment_processor: "shopify",
    amount,
    currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify(order),
  };

  const existingCustomer = await prisma.customer.findUniqueOrThrow({
    where: {
      id: customerId,
    },
  });

  const firstConversionFlag = isFirstConversion({
    customer: existingCustomer,
    linkId,
  });

  const [_sale, link, workspace, customer] = await Promise.all([
    // record sale
    recordSale(saleData),

    // update link sales count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        ...(firstConversionFlag && {
          conversions: {
            increment: 1,
          },
          lastConversionAt: new Date(),
        }),
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
        id: existingCustomer.id,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
        firstSaleAt: existingCustomer.firstSaleAt ? undefined : new Date(),
      },
    }),
    shopifyCheckoutCache.delete(checkoutToken),
  ]);

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "sale.created",
        workspace,
        data: transformSaleEventData({
          ...saleData,
          link,
          clickedAt: customer.clickedAt || customer.createdAt,
          customer,
          metadata: null,
        }),
      }),
    ]),
  );

  return {
    saleData,
  };
}
