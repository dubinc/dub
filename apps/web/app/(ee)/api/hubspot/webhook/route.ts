import { DubApiError } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import crypto from "crypto";
import { logAndRespond } from "../../cron/utils";

const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || "";

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withCron(async ({ rawBody, req }) => {
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

  const qstashResponse = await qstash.batchJSON(
    events.map((event) => ({
      url: `${APP_DOMAIN_WITH_NGROK}/api/hubspot/webhook/process`,
      body: event,
    })),
  );

  console.log(
    `[hubspot/webhook] Enqueued ${events.length} webhook events to be processed.`,
    qstashResponse,
  );

  return logAndRespond("Webhook received.");
});
