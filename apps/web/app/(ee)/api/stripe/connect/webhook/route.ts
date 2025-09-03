import { stripe } from "@/lib/stripe";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { accountUpdated } from "./account-updated";
import { balanceAvailable } from "./balance-available";
import { payoutPaid } from "./payout-paid";

const relevantEvents = new Set([
  "account.updated",
  "balance.available",
  "payout.paid",
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

  try {
    switch (event.type) {
      case "account.updated":
        await accountUpdated(event);
        break;
      case "balance.available":
        await balanceAvailable(event);
        break;
      case "payout.paid":
        await payoutPaid(event);
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
