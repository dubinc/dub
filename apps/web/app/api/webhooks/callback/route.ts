import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordWebhookEvent } from "@/lib/tinybird/record-webhook-event";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { webhookCallbackSchema } from "@/lib/zod/schemas/webhooks";
import { getSearchParams } from "@dub/utils";

// POST /api/webhooks/callback – listen to webhooks status from QStash
export const POST = async (req: Request) => {
  const rawBody = await req.json();

  await verifyQstashSignature(req, rawBody);

  const { url, status, body, sourceBody, sourceMessageId } =
    webhookCallbackSchema.parse(rawBody);

  const request = Buffer.from(sourceBody, "base64").toString("utf-8");
  const response = Buffer.from(body, "base64").toString("utf-8");

  const { id: eventId, event } = webhookPayloadSchema.parse(
    JSON.parse(request),
  );

  const { webhookId } = getSearchParams(req.url);

  await recordWebhookEvent({
    url,
    event,
    event_id: eventId,
    http_status: status,
    webhook_id: webhookId,
    request_body: request,
    response_body: response,
    message_id: sourceMessageId,
  });

  return new Response("OK");
};
