import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendLinkWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

// Handle event "invoice.paid"
export async function invoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = invoice.customer as string;
  const invoiceId = invoice.id;

  // Find customer using projectConnectId and stripeCustomerId
  const customer = await prisma.customer.findFirst({
    where: {
      projectConnectId: stripeAccountId,
      stripeCustomerId,
    },
  });

  if (!customer) {
    return `Customer with stripeCustomerId ${stripeCustomerId} not found, skipping...`;
  }

  // Skip if invoice id is already processed
  const ok = await redis.set(`dub_sale_events:invoiceId:${invoiceId}`, 1, {
    ex: 60 * 60 * 24 * 7,
    nx: true,
  });

  if (!ok) {
    console.info(
      "[Stripe Webhook] Skipping already processed invoice.",
      invoiceId,
    );
    return `Invoice with ID ${invoiceId} already processed, skipping...`;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return `Lead event with customer ID ${customer.id} not found, skipping...`;
  }

  const saleData = {
    ...leadEvent.data[0],
    event_id: nanoid(16),
    event_name: "Subscription update",
    payment_processor: "stripe",
    amount: invoice.amount_paid,
    currency: invoice.currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify({
      invoice,
    }),
  };

  const linkId = leadEvent.data[0].link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return `Link with ID ${linkId} not found, skipping...`;
  }

  await Promise.all([
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
          increment: invoice.amount_paid,
        },
      },
    }),
    // update workspace sales usage
    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: 1,
        },
        salesUsage: {
          increment: invoice.amount_paid,
        },
      },
    }),
  ]);

  waitUntil(
    sendLinkWebhook({
      trigger: "sale.created",
      linkId,
      data: transformSaleEventData({
        ...saleData,
        link,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      }),
    }),
  );

  return `Sale recorded for customer ID ${customer.id} and invoice ID ${invoiceId}`;
}
