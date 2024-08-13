import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import z from "@/lib/zod";
import { nanoid } from "@dub/utils";
import { recordWebhookEvent } from "../../../../lib/tinybird/record-webhook-event";

const schema = z.object({
  status: z.number(),
  body: z.string(),
  sourceMessageId: z.string(),
  url: z.string(),
  sourceBody: z.string(),
  createdAt: z.number(),
});

// POST /api/webhooks/callback – listen to webhooks status from QStash
export const POST = async (req: Request) => {
  const rawBody = await req.json();

  await verifyQstashSignature(req, rawBody);

  const { url, status, body, sourceBody, createdAt, sourceMessageId } =
    schema.parse(rawBody);

  const request = Buffer.from(sourceBody, "base64").toString("utf-8");
  const response = Buffer.from(body, "base64").toString("utf-8");

  // TODO:
  // Use createdAt as timestamp
  // Replace with webhook.id from DB

  const tb = await recordWebhookEvent({
    event_id: nanoid(16),
    event_type: "link.clicked",
    status_code: status,
    webhook_id: sourceMessageId,
    url,
    request,
    response,
  });

  console.log("Webhook event recorded in Tinybird", tb);

  return new Response("OK");
};
