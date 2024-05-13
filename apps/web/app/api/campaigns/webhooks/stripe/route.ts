import { prismaEdge } from "@/lib/prisma/edge";
import { stripe } from "@/lib/stripe";
import {
  getClickEvent,
  getLeadEvent,
  recordCustomer,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const relevantEvents = new Set([
  "customer.created",
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
    case "customer.created":
      await customerCreated(event);
      break;
    case "payment_intent.succeeded":
      await paymentIntentSucceeded(event);
      break;
    // case "checkout.session.completed":
    //   await checkoutSessionCompleted(event);
    //   break;
  }

  return new Response("OK", {
    status: 200,
  });
};

// Handle event "payment_intent.succeeded"
async function paymentIntentSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.PaymentIntent;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;

  // Find customer
  const customer = await prismaEdge.customer.findFirst({
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

  // Record sale
  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    amount: charge.amount_received,
    currency: charge.currency,
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

// Handle event "checkout.session.completed"
async function checkoutSessionCompleted(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Checkout.Session;
  const externalId = charge.metadata?.dubCustomerId || null;

  if (!externalId) {
    return;
  }

  // Find customer
  const customer = await prismaEdge.customer.findFirst({
    where: {
      externalId,
      projectConnectId: event.account,
    },
  });

  // TODO:
  // Should we create a customer if not found?

  if (!customer) {
    return;
  }

  const leadEvent = await getLeadEvent({ customer_id: customer.id });

  if (!leadEvent || leadEvent.data.length === 0) {
    return;
  }

  await recordSale({
    ...leadEvent.data[0],
    event_id: nanoid(16),
    payment_processor: "stripe",
    amount: charge.amount_total || 0,
    currency: charge.currency || "usd",
    recurring: charge.mode === "subscription" ? 1 : 0,
    refunded: 0,
    product_id: "", // TODO: How do we get this?
    recurring_interval: "month", // TODO: Update this
    recurring_interval_count: 1, // TODO: Update this
    metadata: JSON.stringify({
      charge,
    }),
  });
}

// Handle event "customer.created"
async function customerCreated(event: Stripe.Event) {
  const stripeCustomer = event.data.object as Stripe.Customer;
  const stripeAccountId = event.account as string;
  const externalId = stripeCustomer.metadata.dubCustomerId || null;
  const clickId = stripeCustomer.metadata.dubClickId || null;

  // The client app should always send dubClickId via metadata
  if (!clickId) {
    return;
  }

  // Find click
  const clickEvent = await getClickEvent({ clickId });
  if (!clickEvent || clickEvent.data.length === 0) {
    return;
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(clickEvent.data[0]);

  // Create customer
  const customer = await prismaEdge.customer.create({
    data: {
      name: stripeCustomer.name,
      email: stripeCustomer.email,
      stripeCustomerId: stripeCustomer.id,
      projectConnectId: stripeAccountId,
      externalId,
      project: {
        connect: {
          stripeConnectId: stripeAccountId,
        },
      },
    },
  });

  await Promise.all([
    // Record customer in TB
    recordCustomer({
      workspace_id: customer.projectId,
      customer_id: customer.id,
      name: customer.name || "",
      email: customer.email || "",
      avatar: customer.avatar || "",
    }),

    // Record lead
    recordLead({
      ...clickData,
      event_id: nanoid(16),
      event_name: "Customer created",
      customer_id: customer.id,
    }),
  ]);
}
