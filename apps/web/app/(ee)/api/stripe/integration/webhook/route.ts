import { stripe } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import { withAxiom } from "next-axiom";
import Stripe from "stripe";
import { accountApplicationDeauthorized } from "./account-application-deauthorized";
import { chargeRefunded } from "./charge-refunded";
import { checkoutSessionCompleted } from "./checkout-session-completed";
import { couponDeleted } from "./coupon-deleted";
import { customerCreated } from "./customer-created";
import { customerUpdated } from "./customer-updated";
import { invoicePaid } from "./invoice-paid";
import { promotionCodeUpdated } from "./promotion-code-updated";

const relevantEvents = new Set([
  "customer.created",
  "customer.updated",
  "checkout.session.completed",
  "invoice.paid",
  "charge.refunded",
  "account.application.deauthorized",
  "coupon.deleted",
  "promotion_code.updated",
]);

// POST /api/stripe/integration/webhook – listen to Stripe webhooks (for Stripe Integration)
export const POST = withAxiom(async (req: Request) => {
  const pathname = new URL(req.url).pathname;
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature");

  // @see https://github.com/dubinc/dub/blob/main/apps/web/app/(ee)/api/stripe/integration/webhook/test/route.ts
  let webhookSecret: string | undefined;
  let mode: StripeMode;

  if (pathname.endsWith("/test")) {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET_TEST;
    mode = "test";
  } else if (pathname.endsWith("/sandbox")) {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET_SANDBOX;
    mode = "sandbox";
  } else {
    webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET;
    mode = "live";
  }

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

  // When an app is installed in both live & test mode,
  // test mode events are sent to both the test mode and live mode endpoints,
  // and live mode events are sent to the live mode endpoint.
  // See: https://docs.stripe.com/stripe-apps/build-backend#event-behavior-depends-on-install-mode
  if (!event.livemode && mode === "live") {
    return logAndRespond(
      `Received a test webhook event (${event.type}) on our live webhook receiver endpoint, skipping...`,
    );
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
      response = await checkoutSessionCompleted(event, mode);
      break;
    case "invoice.paid":
      response = await invoicePaid(event, mode);
      break;
    case "charge.refunded":
      response = await chargeRefunded(event, mode);
      break;
    case "account.application.deauthorized":
      response = await accountApplicationDeauthorized(event);
      break;
    case "coupon.deleted":
      response = await couponDeleted(event);
      break;
    case "promotion_code.updated":
      response = await promotionCodeUpdated(event);
      break;
  }

  return logAndRespond(`[${event.type}]: ${response}`);
});
