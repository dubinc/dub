import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";

// Handle event "checkout.session.completed"
export async function checkoutSessionCompleted(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Checkout.Session;
  const externalId = charge.metadata?.dubCustomerId || null;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;

  if (!externalId) {
    return;
  }

  // Update customer with stripe customerId
  const customer = await prisma.customer.update({
    where: {
      projectConnectId_externalId: {
        projectConnectId: stripeAccountId,
        externalId,
      },
    },
    data: {
      stripeCustomerId,
    },
  });

  // Find lead
  const leadEvent = await getLeadEvent({ customer_id: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return;
  }

  // Record sale
  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    amount: charge.amount_total!,
    currency: charge.currency!,
    refunded: 0,

    // How do we get these?
    recurring: 0,
    product_id: "",
    recurring_interval: "month",
    recurring_interval_count: 1,

    metadata: JSON.stringify({
      charge,
    }),
  });
}
