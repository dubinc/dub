import { stripe } from "@/lib/stripe";
import { getClickEvent, recordConversion } from "@/lib/tinybird";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// "customer.created"
const SUPPORTED_STRIPE_EVENTS = ["charge.succeeded"];

export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature");

  if (!sig || !webhookSecret) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  try {
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

    if (!SUPPORTED_STRIPE_EVENTS.includes(event.type)) {
      // Ignore unsupported events
      return new Response("OK", {
        status: 200,
      });
    }

    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event);
        break;
    }

    return new Response("OK", {
      status: 200,
    });
  } catch (error: any) {
    console.log("Stripe webhook error:", error);
  }
};

// Handle the "charge.succeeded" event
async function handleChargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  console.log("event", charge);

  if (!charge.customer) {
    return;
  }

  // Find customer details using charge.customer
  const customer = (await stripe.customers.retrieve(
    charge.customer as string,
  )) as Stripe.Customer;
  const customerKey = customer.metadata?.customerKey || null;

  if (!customerKey) {
    return;
  }

  console.log("customer", customer);

  // Check customerKey exists in TB

  // TODO: Update clickId
  const clickEvent = await getClickEvent({ clickId: "jlNZlZKVa2X6ZCcZ" });

  if (!clickEvent || clickEvent.data.length === 0) {
    return;
  }

  await recordConversion({
    ...clickEvent.data[0],
    event_name: "",
    event_type: "sale",
    event_metadata: "",
    customer_id: customerKey,
    timestamp: new Date(Date.now()).toISOString(),
  });
}
