import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordPostbackEvent } from "@/lib/postback/api/record-postback-event";
import {
  postbackCallbackBodySchema,
  postbackCallbackParamsSchema,
} from "@/lib/postback/schemas";
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

  const { status, url, sourceMessageId, body, sourceBody, retried } =
    postbackCallbackBodySchema.parse(JSON.parse(rawBody));

  const { postbackId, eventId, event } = postbackCallbackParamsSchema.parse(
    getSearchParams(req.url),
  );

  const postback = await prisma.postback.findUnique({
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

  const tbResponse = await recordPostbackEvent({
    event_id: eventId,
    postback_id: postbackId,
    message_id: sourceMessageId,
    event,
    url,
    response_status: status === -1 ? 503 : status,
    request_body: request,
    response_body: response,
    retry_attempt: retried,
  });

  if (tbResponse.successful_rows === 0) {
    return logAndRespond(
      `Failed to record event ${eventId} for postback ${postbackId}.`,
      {
        status: 400,
      },
    );
  }

  return logAndRespond(
    `Event ${eventId} for postback ${postbackId} processed.`,
  );
};
