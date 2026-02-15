import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import {
  postbackCallbackBodySchema,
  postbackCallbackParamsSchema,
} from "@/lib/postback/schemas";
import { recordPostbackEvent } from "@/lib/tinybird/record-postback-event";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { logAndRespond } from "app/(ee)/api/cron/utils";

// POST /api/postbacks/callback - callback from QStash
export const POST = async (req: Request) => {
  const rawBody = await req.text();

  await verifyQstashSignature({
    req,
    rawBody,
  });

  const { status, url, sourceMessageId, body, sourceBody } =
    postbackCallbackBodySchema.parse(JSON.parse(rawBody));

  const { postbackId, eventId, event } = postbackCallbackParamsSchema.parse(
    getSearchParams(req.url),
  );

  const postback = await prisma.partnerPostback.findUnique({
    where: {
      id: postbackId,
    },
    select: {
      id: true,
    },
  });

  if (!postback) {
    return logAndRespond(`Postback ${postbackId} not found.`);
  }

  const request = Buffer.from(sourceBody, "base64").toString("utf-8");
  const response = Buffer.from(body, "base64").toString("utf-8");

  await recordPostbackEvent({
    event_id: eventId,
    postback_id: postbackId,
    message_id: sourceMessageId,
    event,
    url,
    response_status: status === -1 ? 503 : status,
    request_body: request,
    response_body: response,
  });

  return logAndRespond(`Postback ${postbackId} processed.`);
};
