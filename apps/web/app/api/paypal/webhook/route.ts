import { log } from "@dub/utils";
import { payoutStatusChanged } from "./payout-status-changed";

const relevantEvents = new Set([
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

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const headers = req.headers;

  // TODO:
  // Verify the webhook signature
  const body = JSON.parse(rawBody);

  if (!relevantEvents.has(body.event_type)) {
    return new Response("Unsupported event, skipping...");
  }

  console.info(`Paypal webhook received: ${body.event_type}`, body);

  try {
    switch (body.event_type) {
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
      case "PAYMENT.PAYOUTS-ITEM.BLOCKED":
      case "PAYMENT.PAYOUTS-ITEM.CANCELED":
      case "PAYMENT.PAYOUTS-ITEM.DENIED":
      case "PAYMENT.PAYOUTS-ITEM.FAILED":
      case "PAYMENT.PAYOUTS-ITEM.HELD":
      case "PAYMENT.PAYOUTS-ITEM.REFUNDED":
      case "PAYMENT.PAYOUTS-ITEM.RETURNED":
      case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
        await payoutStatusChanged(body);
        break;
    }
  } catch (error) {
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

// const headers = request.headers;
// const event = request.body;
// const data = JSON.parse(event)
