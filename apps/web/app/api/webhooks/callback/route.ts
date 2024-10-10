import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { recordWebhookEvent } from "@/lib/tinybird/record-webhook-event";
import {
  handleWebhookFailure,
  resetWebhookFailureCount,
} from "@/lib/webhook/failure";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { webhookCallbackSchema } from "@/lib/zod/schemas/webhooks";
import { getSearchParams } from "@dub/utils";

// POST /api/webhooks/callback – listen to webhooks status from QStash
export const POST = async (req: Request) => {
  const rawBody = await req.json();

  await verifyQstashSignature(req, rawBody);

  const { url, status, body, sourceBody, sourceMessageId } =
    webhookCallbackSchema.parse(rawBody);

  const { webhookId } = getSearchParams(req.url);

  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    console.error("Webhook not found", { webhookId });
    return new Response("Webhook not found");
  }

  const request = Buffer.from(sourceBody, "base64").toString("utf-8");
  const response = Buffer.from(body, "base64").toString("utf-8");

  const { id: eventId, event } = webhookPayloadSchema.parse(
    JSON.parse(request),
  );

  const isFailed = status >= 400;

  await Promise.all([
    // Record the webhook event
    recordWebhookEvent({
      url,
      event,
      event_id: eventId,
      http_status: status,
      webhook_id: webhookId,
      request_body: request,
      response_body: response,
      message_id: sourceMessageId,
    }),

    // Handle the webhook delivery failure if it's the last retry
    ...(isFailed ? [handleWebhookFailure(webhookId)] : []),

    // Only reset if there were previous failures
    ...(webhook.consecutiveFailures > 0 && !isFailed
      ? [resetWebhookFailureCount(webhookId)]
      : []),
  ]);

  return new Response("OK");
};
