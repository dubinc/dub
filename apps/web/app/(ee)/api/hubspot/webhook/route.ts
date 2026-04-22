import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import crypto from "crypto";
import { logAndRespond } from "../../cron/utils";

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

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

    // HubSpot can send multiple events in a single request, so we fan them out
    // to QStash and process each event independently in /api/hubspot/webhook/process.
    // This keeps the webhook handler fast and ensures a slow/failing event doesn't
    // block or fail the rest of the batch.
    const qstashResponse = await enqueueBatchJobs(
      finalEvents.map((event) => ({
        queueName: "process-hubspot-webhook",
        url: `${APP_DOMAIN_WITH_NGROK}/api/hubspot/webhook/process`,
        deduplicationId: event.eventId,
        method: "POST",
        body: event,
      })),
    );

    console.log(
      `[hubspot/webhook] Enqueued ${finalEvents.length} webhook events to be processed.`,
      qstashResponse,
    );

    return logAndRespond("Webhook received.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
