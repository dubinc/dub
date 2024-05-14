import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";

// Handle event "invoice.paid"
export async function invoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = invoice.customer as string;

  // Find customer
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
  const leadEvent = await getLeadEvent({ customer_id: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return;
  }

  // Find the product from line items
  const stripeProductId = invoice.lines.data[0]?.plan?.product as string;

  // Record sale
  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    amount: invoice.amount_paid,
    currency: invoice.currency,
    refunded: 0,

    // How do we get these?
    recurring: 0,
    product_id: stripeProductId,
    recurring_interval: "month",
    recurring_interval_count: 1,

    metadata: JSON.stringify({
      invoice,
    }),
  });
}
