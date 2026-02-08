import { log } from "@dub/utils";
import { payoutsItemFailed } from "./payouts-item-failed";
import { payoutsItemSucceeded } from "./payouts-item-succeeded";
import { verifySignature } from "./verify-signature";

const relevantEvents = new Set([
  // Individual payout item events
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED",
  "PAYMENT.PAYOUTS-ITEM.CANCELED",
  "PAYMENT.PAYOUTS-ITEM.DENIED",
  "PAYMENT.PAYOUTS-ITEM.FAILED",
  "PAYMENT.PAYOUTS-ITEM.HELD",
  "PAYMENT.PAYOUTS-ITEM.REFUNDED",
  "PAYMENT.PAYOUTS-ITEM.RETURNED",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
]);

// POST /api/paypal/webhook – Listen to Paypal webhook events
export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const headers = req.headers;

  try {
    const isSignatureValid = await verifySignature({
      event: rawBody,
      headers,
    });

    if (!isSignatureValid) {
      throw new Error("Invalid signature");
    }

    const body = JSON.parse(rawBody);

    if (!relevantEvents.has(body.event_type)) {
      console.info(`[Paypal] Unsupported event: ${body.event_type}`);
      return new Response("Unsupported event, skipping...");
    }

    console.info(`[Paypal] Webhook received: ${body.event_type}`, body);

    switch (body.event_type) {
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
        await payoutsItemSucceeded(body);
        break;
      case "PAYMENT.PAYOUTS-ITEM.BLOCKED":
      case "PAYMENT.PAYOUTS-ITEM.CANCELED":
      case "PAYMENT.PAYOUTS-ITEM.DENIED":
      case "PAYMENT.PAYOUTS-ITEM.FAILED":
      case "PAYMENT.PAYOUTS-ITEM.HELD":
      case "PAYMENT.PAYOUTS-ITEM.REFUNDED":
      case "PAYMENT.PAYOUTS-ITEM.RETURNED":
      case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
        await payoutsItemFailed(body);
        break;
    }
  } catch (error) {
    console.error(`[Paypal] ${error.message}`);

    await log({
      message: `Paypal webhook failed. Error: ${error.message}`,
      type: "errors",
    });

    return new Response('Webhook error: "Webhook handler failed. View logs."', {
      status: 400,
    });
  }

  return new Response("OK");
};
