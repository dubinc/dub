import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { HUBSPOT_OBJECT_TYPE_IDS } from "@/lib/integrations/hubspot/constants";
import { APP_DOMAIN_WITH_NGROK, stableSort } from "@dub/utils";
import crypto from "crypto";
import { logAndRespond } from "../../cron/utils";

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

const queue = qstash.queue({
  queueName: "process-hubspot-webhook",
});

const objectTypeOrder = new Map(
  HUBSPOT_OBJECT_TYPE_IDS.map((id, index) => [id, index]),
);

const subscriptionOrder = {
  "object.creation": 0,
  "object.propertyChange": 1,
} as const;

type SubscriptionType = keyof typeof subscriptionOrder;

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-HubSpot-Signature");

    // Verify webhook signature
    if (!signature) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing X-HubSpot-Signature header.",
      });
    }

    if (!HUBSPOT_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing HUBSPOT_CLIENT_SECRET environment variable.",
      });
    }

    // Create expected hash: client_secret + request_body
    const sourceString = HUBSPOT_CLIENT_SECRET + rawBody;
    const expectedHash = crypto
      .createHash("sha256")
      .update(sourceString)
      .digest("hex");

    // Compare with provided signature
    if (signature !== expectedHash) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid webhook signature.",
      });
    }

    const events = JSON.parse(rawBody) as any[];
    const finalEvents = Array.isArray(events) ? events : [events];

    // Sort the events based on objectTypeId and subscriptionType
    // objectTypeId first, then object.creation before object.propertyChange within the same type
    const sortedEvents = stableSort(finalEvents, (a, b) => {
      const typeA = objectTypeOrder.get(a.objectTypeId) ?? Infinity;
      const typeB = objectTypeOrder.get(b.objectTypeId) ?? Infinity;

      if (typeA !== typeB) {
        return typeA - typeB;
      }

      const subA =
        subscriptionOrder[a.subscriptionType as SubscriptionType] ?? 2;

      const subB =
        subscriptionOrder[b.subscriptionType as SubscriptionType] ?? 2;

      return subA - subB;
    });

    // HubSpot can send multiple events in a single request, so we fan them out
    // to QStash and process each event independently in /api/hubspot/webhook/process.
    // This keeps the webhook handler fast and ensures a slow/failing event doesn't
    // block or fail the rest of the batch.
    const qstashResponse = await Promise.all(
      finalEvents.map((event) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/hubspot/webhook/process`,
          deduplicationId: event.id,
          method: "POST",
          body: event,
        }),
      ),
    );

    console.log(
      `[hubspot/webhook] Enqueued ${sortedEvents.length} webhook events to be processed.`,
      qstashResponse,
    );

    return logAndRespond("Webhook received.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
