import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { nanoid } from "@dub/utils";
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
    return;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return;
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
    return;
  }

  await Promise.all([
    recordSale({
      ...leadEvent.data[0],
      event_id: nanoid(16),
      payment_processor: "stripe",
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoice_id: invoiceId,
      metadata: JSON.stringify({
        invoice,
      }),
    }),
    // update link sales count
    prisma.link.update({
      where: {
        id: leadEvent.data[0].link_id,
      },
      data: {
        sales: {
          increment: 1,
        },
      },
    }),
  ]);
}
