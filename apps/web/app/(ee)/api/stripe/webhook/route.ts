import { stripe } from "@/lib/stripe";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { chargeFailed } from "./charge-failed";
import { chargeRefunded } from "./charge-refunded";
import { chargeSucceeded } from "./charge-succeeded";
import { checkoutSessionCompleted } from "./checkout-session-completed";
import { customerSubscriptionDeleted } from "./customer-subscription-deleted";
import { customerSubscriptionUpdated } from "./customer-subscription-updated";
import { invoicePaymentFailed } from "./invoice-payment-failed";
import { paymentIntentRequiresAction } from "./payment-intent-requires-action";

const relevantEvents = new Set([
  "charge.succeeded",
  "charge.failed",
  "charge.refunded",
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "payment_intent.requires_action",
]);

// POST /api/stripe/webhook – listen to Stripe webhooks
export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) return;
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

  try {
    switch (event.type) {
      case "charge.succeeded":
        await chargeSucceeded(event);
        break;
      case "charge.failed":
        await chargeFailed(event);
        break;
      case "charge.refunded":
        await chargeRefunded(event);
        break;
      case "checkout.session.completed":
        await checkoutSessionCompleted(event);
        break;
      case "customer.subscription.updated":
        await customerSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await customerSubscriptionDeleted(event);
        break;
      case "invoice.payment_failed":
        await invoicePaymentFailed(event);
        break;
      case "payment_intent.requires_action":
        await paymentIntentRequiresAction(event);
        break;
    }
  } catch (error) {
    await log({
      message: `Stripe webhook failed (${event.type}). Error: ${error.message}`,
      type: "errors",
    });
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
    });
  }

  return NextResponse.json({ received: true });
};
