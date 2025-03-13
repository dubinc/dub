import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordWebhookEvent } from "@/lib/tinybird/record-webhook-event";
import { WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import {
  handleWebhookFailure,
  resetWebhookFailureCount,
} from "@/lib/webhook/failure";
import { webhookCallbackSchema } from "@/lib/zod/schemas/webhooks";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { z } from "zod";

const searchParamsSchema = z.object({
  webhookId: z.string(),
  eventId: z.string(),
  event: z.enum(WEBHOOK_TRIGGERS),
});

// POST /api/webhooks/callback – listen to webhooks status from QStash
export const POST = async (req: Request) => {
  const rawBody = await req.text();
  await verifyQstashSignature({ req, rawBody });

  const { url, status, body, sourceBody, sourceMessageId } =
    webhookCallbackSchema.parse(JSON.parse(rawBody));

  const { webhookId, eventId, event } = searchParamsSchema.parse(
    getSearchParams(req.url),
  );

  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    console.error("Webhook not found", { webhookId });
    return new Response("Webhook not found");
  }

  const request = Buffer.from(sourceBody, "base64").toString("utf-8");
  const response = Buffer.from(body, "base64").toString("utf-8");
  const isFailed = status >= 400 || status === -1;

  // Unsubscribe Zapier webhook
  if (
    webhook.receiver === "zapier" &&
    webhook.installationId &&
    status === 410
  ) {
    await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });

    return new Response(`Unsubscribed Zapier webhook ${webhookId}`);
  }

  await Promise.all([
    // Record the webhook event
    recordWebhookEvent({
      url,
      event,
      event_id: eventId,
      http_status: status === -1 ? 503 : status,
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

  return new Response(`Webhook ${webhookId} processed`);
};
