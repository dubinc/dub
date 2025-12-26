import { stripe } from "@/lib/stripe";
import { log } from "@dub/utils";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import Stripe from "stripe";
import { accountApplicationDeauthorized } from "./account-application-deauthorized";
import { accountUpdated } from "./account-updated";
import { balanceAvailable } from "./balance-available";
import { payoutFailed } from "./payout-failed";
import { payoutPaid } from "./payout-paid";

const relevantEvents = new Set([
  "account.application.deauthorized",
  "account.external_account.updated",
  "account.updated",
  "balance.available",
  "payout.paid",
  "payout.failed",
]);

// POST /api/stripe/connect/webhook – listen to Stripe Connect webhooks (for connected accounts)
export const POST = async (req: Request) => {
  const buf = await req.text();
  const sig = req.headers.get("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
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

  let response = "OK";
  try {
    switch (event.type) {
      case "account.application.deauthorized":
        response = await accountApplicationDeauthorized(event);
        break;
      case "account.updated":
        response = await accountUpdated(event);
        break;
      case "account.external_account.updated":
      case "balance.available":
        response = await balanceAvailable(event);
        break;
      case "payout.paid":
        response = await payoutPaid(event);
        break;
      case "payout.failed":
        response = await payoutFailed(event);
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

  return logAndRespond(`[${event.type}]: ${response}`);
};
