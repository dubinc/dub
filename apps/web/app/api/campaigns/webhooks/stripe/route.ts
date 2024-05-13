import { getCustomer } from "@/lib/planetscale";
import { stripe } from "@/lib/stripe";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const relevantEvents = new Set([
  "customer.created",
  "charge.succeeded",
  "payment_intent.succeeded",
  "checkout.session.completed",
]);

export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature");

  if (!sig || !webhookSecret) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

  // Ignore unsupported events
  if (!relevantEvents.has(event.type)) {
    return new Response("OK", {
      status: 200,
    });
  }

  switch (event.type) {
    // case "charge.succeeded":
    // case "payment_intent.succeeded":
    case "checkout.session.completed":
      await checkoutSessionCompleted(event);
      break;
    case "customer.created":
      await customerCreated(event);
      break;
  }

  return new Response("OK", {
    status: 200,
  });
};

// Handle event "checkout.session.completed"
async function checkoutSessionCompleted(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Checkout.Session;
  const customerId = charge.metadata?.dubCustomerId || null;

  if (!customerId) {
    console.error("No `dubCustomerId` found in metadata", charge);
    return;
  }

  const leadEvent = await getLeadEvent({ customer_id: customerId });

  if (!leadEvent || leadEvent.data.length === 0) {
    console.error("No lead event found for `dubCustomerId`", customerId);
    return;
  }

  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    product_id: "",
    amount: charge.amount_total || 0,
    currency: charge.currency || "usd",
    recurring: 1, // TODO: Update this
    recurring_interval: "month", // TODO: Update this
    recurring_interval_count: 1, // TODO: Update this
    refunded: 0,
    metadata: JSON.stringify({
      charge,
    }),
  });
}

// Handle event "customer.created"
async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const externalId = stripeCustomer.metadata?.dubCustomerId || null;
  const projectConnectId = event.account;

  console.log("Customer created", stripeCustomer);

  if (!externalId || !projectConnectId) {
    return;
  }

  const customer = await getCustomer({ externalId, projectConnectId });

  if (!customer) {
    console.error("No customer found for `dubCustomerId`", externalId);
    return;
  }

  // TODO:
  // Create a customer in Tinybird + MySQL
}
