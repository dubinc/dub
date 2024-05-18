import { stripe } from "@/lib/stripe";
import { checkoutSessionCompleted } from "./checkout-session-completed";
import { customerCreated } from "./customer-created";
import { invoicePaid } from "./invoice-paid";

const webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET;

const relevantEvents = new Set([
  "customer.created",
  "checkout.session.completed",
  "invoice.paid",
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
    case "checkout.session.completed":
      await checkoutSessionCompleted(event);
      break;
    case "invoice.paid":
      await invoicePaid(event);
      break;
  }

  return new Response("OK", {
    status: 200,
  });
};
