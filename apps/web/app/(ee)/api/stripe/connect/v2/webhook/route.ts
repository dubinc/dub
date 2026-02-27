import { stripe } from "@/lib/stripe";
import { log } from "@dub/utils";
import { logAndRespond } from "app/(ee)/api/cron/utils";
import Stripe from "stripe";
import { outboundPaymentFailed } from "./outbound-payment-failed";
import { outboundPaymentPosted } from "./outbound-payment-posted";
import { outboundPaymentReturned } from "./outbound-payment-returned";
import { recipientAccountClosed } from "./recipient-account-closed";
import { recipientConfigurationUpdated } from "./recipient-configuration-updated";

const relevantEvents = new Set([
  "v2.core.account.closed",
  "v2.core.account[configuration.recipient].updated",
  "v2.money_management.outbound_payment.posted",
  "v2.money_management.outbound_payment.returned",
  "v2.money_management.outbound_payment.failed",
]);

const webhookSecret = process.env.STRIPE_STABLECOIN_WEBHOOK_SECRET;

// POST /api/stripe/connect/v2/webhook – Stripe Connect Account v2 webhooks
export const POST = async (req: Request) => {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature");

  if (!signature) {
    return logAndRespond("Missing Stripe-Signature header.");
  }

  if (!webhookSecret) {
    return logAndRespond(
      "STRIPE_STABLECOIN_WEBHOOK_SECRET environment variable is not set.",
      {
        status: 500,
      },
    );
  }

  let event: Stripe.ThinEvent;

  try {
    event = stripe.parseThinEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return logAndRespond(`[Webhook error]: ${message}`, {
      status: 400,
    });
  }

  if (!relevantEvents.has(event.type)) {
    return logAndRespond(`Unsupported event ${event.type}, skipping...`);
  }

  let response = "OK";
  try {
    switch (event.type) {
      // @ts-ignore
      case "v2.core.account.closed":
        response = await recipientAccountClosed(event);
        break;
      // @ts-ignore
      case "v2.core.account[configuration.recipient].updated":
        response = await recipientConfigurationUpdated(event);
        break;
      // @ts-ignore
      case "v2.money_management.outbound_payment.posted":
        response = await outboundPaymentPosted(event);
        break;
      // @ts-ignore
      case "v2.money_management.outbound_payment.returned":
        response = await outboundPaymentReturned(event);
        break;
      // @ts-ignore
      case "v2.money_management.outbound_payment.failed":
        response = await outboundPaymentFailed(event);
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log({
      message: `/api/stripe/connect/v2/webhook webhook failed (${event.type}). Error: ${message}`,
      type: "errors",
    });

    return logAndRespond(`[Webhook error]: ${message}`, {
      status: 400,
    });
  }

  return logAndRespond(`[${event.type}]: ${response}`);
};
