import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextRequest } from "next/server";
import { encryptToken } from "../auth/encrypt-token";
import { qstash } from "../cron";
import { parseRequestBody } from "./utils";

const ENDPOINTS_TO_RETRY = ["/api/track/lead", "/api/track/sale", "/api/links"];

const queue = qstash.queue({
  queueName: "retry-failed-request",
});

export async function queueFailedRequestForRetry({
  error,
  apiKey,
  req,
}: {
  error: unknown;
  apiKey: string | undefined;
  req: NextRequest;
}): Promise<void> {
  // Only queue requests for specific endpoints that failed due to DB connection errors
  if (
    !(error instanceof Prisma.PrismaClientUnknownRequestError) ||
    !apiKey ||
    !ENDPOINTS_TO_RETRY.includes(req.nextUrl.pathname)
  ) {
    return;
  }

  const errorReq = req.clone();

  const response = await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/retry-failed-request`,
    body: {
      body: await parseRequestBody(errorReq),
      method: errorReq.method,
      pathname: req.nextUrl.pathname,
    },
    headers: {
      Authorization: `Bearer ${await encryptToken(apiKey)}`,
    },
  });

  if (response.messageId) {
    console.log(
      `${errorReq.method} ${req.nextUrl.pathname} queued for retry (${response.messageId}).`,
    );
  }
}
