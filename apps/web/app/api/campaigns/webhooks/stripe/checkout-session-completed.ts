import { prisma } from "@/lib/prisma";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";
import { retrieveSubscription } from "./subscription";

// Handle event "checkout.session.completed"
export async function checkoutSessionCompleted(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Checkout.Session;
  const externalId = charge.metadata?.dubCustomerId || null;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;
  const subscriptionId = charge.subscription as string;
  const invoiceId = charge.invoice as string;

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
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent || leadEvent.data.length === 0) {
    return;
  }

  // Retrieve subscription if available
  const subscription = await retrieveSubscription(subscriptionId);

  // Record sale
  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    amount: charge.amount_total!,
    currency: charge.currency!,
    invoice_id: invoiceId,
    recurring: subscription?.recurring || 0,
    product_id: subscription?.productId || "",
    recurring_interval: subscription?.recurringInterval || "",
    recurring_interval_count: subscription?.recurringIntervalCount || 0,
    refunded: 0,
    metadata: JSON.stringify({
      charge,
    }),
  });
}
