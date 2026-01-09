import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { HTTPMethods } from "@upstash/qstash";
import { NextRequest } from "next/server";
import { logger } from "../axiom/server";
import { qstash } from "../cron";
import { parseRequestBody } from "./utils";

const RETRYABLE_ROUTES: Record<string, Set<string>> = {
  POST: new Set(["/api/track/lead", "/api/track/sale", "/api/links"]),
} as const;

// This function only runs the first time for a request.
// If the request already has an "upstash-signature" header, it will not be queued again (prevents retry loops).
export async function queueFailedRequestForRetry({
  req,
  error,
  apiKey,
}: {
  req: NextRequest;
  error: unknown;
  apiKey: string | undefined;
}) {
  const errorReq = req.clone();
  const pathname = req.nextUrl.pathname;
  const url = `${APP_DOMAIN_WITH_NGROK}${pathname}`;
  const method = errorReq.method as HTTPMethods;
  const isRetryable = RETRYABLE_ROUTES[method]?.has(pathname) ?? false;

  // Skip retry if any of the below are true:
  // - error not a Prisma unknown request error (we only want to retry DB errors)
  // - no API key provided
  // - route is not retryable
  // - request already has an upstash signature (to prevent retry loops)
  if (
    !(error instanceof Prisma.PrismaClientUnknownRequestError) ||
    !apiKey ||
    !isRetryable ||
    errorReq.headers.get("upstash-signature") != null
  ) {
    return;
  }

  // Generate random jitter between 500-1500ms to add variability to retry delays
  const jitter = Math.floor(Math.random() * 1000) + 500; // Random value between 500-1500

  // Custom retry delay with exponential backoff and jitter
  // Formula: max(jitter, pow(2, retried) * 100)
  // This ensures minimum delay is the jitter value, and grows exponentially with retries
  const retryDelay = `max(${jitter}, pow(2, retried) * 100)`;

  const response = await qstash.publishJSON({
    url,
    method,
    body: await parseRequestBody(errorReq),
    headers: Object.fromEntries(errorReq.headers.entries()),
    retries: 5,
    retryDelay,
  });

  if (response.messageId) {
    console.log("Request queued for retry", {
      method,
      url,
      messageId: response.messageId,
    });

    logger.info("request.retry.queued", {
      url,
      method,
      messageId: response.messageId,
    });

    await logger.flush();
  }
}
