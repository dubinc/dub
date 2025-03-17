import { stripe } from "@/lib/stripe";
import { withAxiom } from "next-axiom";
import Stripe from "stripe";
import { accountApplicationDeauthorized } from "./account-application-deauthorized";
import { chargeRefunded } from "./charge-refunded";
import { checkoutSessionCompleted } from "./checkout-session-completed";
import { customerCreated } from "./customer-created";
import { customerUpdated } from "./customer-updated";
import { invoicePaid } from "./invoice-paid";

const relevantEvents = new Set([
  "customer.created",
  "customer.updated",
  "checkout.session.completed",
  "invoice.paid",
  "charge.refunded",
  "account.application.deauthorized",
]);

// POST /api/stripe/integration/webhook – listen to Stripe webhooks (for Stripe Integration)
export const POST = withAxiom(async (req: Request) => {
  const buf = await req.text();
  const { livemode } = JSON.parse(buf);

  const sig = req.headers.get("Stripe-Signature");
  const webhookSecret = !livemode
    ? process.env.STRIPE_APP_WEBHOOK_SECRET_TEST
    : process.env.STRIPE_APP_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  // Ignore unsupported events
  if (!relevantEvents.has(event.type)) {
    return new Response("Unsupported event, skipping...", {
      status: 200,
    });
  }

  let response = "OK";

  switch (event.type) {
    case "customer.created":
      response = await customerCreated(event);
      break;
    case "customer.updated":
      response = await customerUpdated(event);
      break;
    case "checkout.session.completed":
      response = await checkoutSessionCompleted(event);
      break;
    case "invoice.paid":
      response = await invoicePaid(event);
      break;
    case "charge.refunded":
      response = await chargeRefunded(event);
      break;
    case "account.application.deauthorized":
      response = await accountApplicationDeauthorized(event);
      break;
  }

  return new Response(response, {
    status: 200,
  });
});
