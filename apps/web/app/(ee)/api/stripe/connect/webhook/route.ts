import { withAxiomBodyLog } from "@/lib/axiom/server";
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

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

// POST /api/stripe/connect/webhook – listen to Stripe Connect webhooks (for connected accounts)
export const POST = withAxiomBodyLog(async (req: Request) => {
  const clonedReq = req.clone();
  const buf = await clonedReq.text();

  const signature = clonedReq.headers.get("Stripe-Signature");

  if (!signature) {
    return logAndRespond("Missing Stripe-Signature header.", {
      status: 400,
    });
  }

  if (!webhookSecret) {
    return logAndRespond(
      "STRIPE_CONNECT_WEBHOOK_SECRET environment variable is not set.",
      {
        status: 500,
      },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
  } catch (err: any) {
    return logAndRespond(`Webhook Error: ${err.message}`, {
      status: 400,
    });
  }

  // Ignore unsupported events
  if (!relevantEvents.has(event.type)) {
    return logAndRespond(`Unsupported event ${event.type}, skipping...`);
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
      message: `Stripe Connect webhook failed (${event.type}). Error: ${error.message}`,
      type: "errors",
    });

    return logAndRespond(`Webhook error: ${error.message}`, {
      status: 400,
    });
  }

  return logAndRespond(`[${event.type}]: ${response}`);
});
