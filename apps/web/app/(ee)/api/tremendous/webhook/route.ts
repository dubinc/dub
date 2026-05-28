import * as z from "zod/v4";
import { orderCanceled } from "./order-canceled";
import { rewardsCanceled } from "./rewards-canceled";
import { rewardsDeliveryFailed } from "./rewards-delivery-failed";
import { rewardsDeliverySucceeded } from "./rewards-delivery-succeeded";
import { verifySignature } from "./verify-signature";

const TREMENDOUS_WEBHOOK_RELEVANT_EVENTS = new Set([
  "REWARDS.DELIVERY.SUCCEEDED",
  "REWARDS.DELIVERY.FAILED",
  "REWARDS.CANCELED",
  "ORDERS.CANCELED",
]);

const tremendousWebhookSchema = z.object({
  event: z.string(),
  uuid: z.string(),
  created_utc: z.string().optional(),
  payload: z.object({
    resource: z.object({
      id: z.string(),
      type: z.string(),
    }),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

// POST /api/tremendous/webhook
export const POST = async (req: Request) => {
  try {
    await verifySignature(req.clone());
  } catch (error) {
    return new Response(error.message);
  }

  const rawBody = await req.text();

  const { event, uuid, created_utc, payload } = tremendousWebhookSchema.parse(
    JSON.parse(rawBody),
  );

  if (!TREMENDOUS_WEBHOOK_RELEVANT_EVENTS.has(event)) {
    return new Response("Unsupported event");
  }

  console.log("Webhook payload", {
    event,
    uuid,
    created_utc,
    payload,
  });

  switch (event) {
    case "REWARDS.DELIVERY.SUCCEEDED":
      await rewardsDeliverySucceeded(event);
      break;
    case "REWARDS.DELIVERY.FAILED":
      await rewardsDeliveryFailed(event);
      break;
    case "REWARDS.CANCELED":
      await rewardsCanceled(event);
      break;
    case "ORDERS.CANCELED":
      await orderCanceled(event);
      break;
  }

  return new Response("OK");
};
