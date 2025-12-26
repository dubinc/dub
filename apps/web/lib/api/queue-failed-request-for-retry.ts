import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { HTTPMethods } from "@upstash/qstash";
import { NextRequest } from "next/server";
import { logger } from "../axiom/server";
import { qstash } from "../cron";
import { parseRequestBody } from "./utils";

const RETRYABLE_RULES: Record<string, Set<string>> = {
  POST: new Set(["/api/track/lead", "/api/track/sale", "/api/links"]),
} as const;

// This function only runs the first time for a request.
// If the request already has an "upstash-signature" header, it will not be queued again (prevents retry loops).
export async function queueFailedRequestForRetry({
  error,
  apiKey,
  req,
}: {
  error: unknown;
  apiKey: string | undefined;
  req: NextRequest;
}) {
  const errorReq = req.clone();
  const pathname = req.nextUrl.pathname;
  const url = `${APP_DOMAIN_WITH_NGROK}${pathname}`;
  const method = errorReq.method as HTTPMethods;
  const isRetryable = RETRYABLE_RULES[method]?.has(pathname) ?? false;

  // Skip retry if: error is one of the below
  // - not a Prisma unknown request error
  // - no API key provided
  // - endpoint is not retryable
  // - request already has an upstash signature (to prevent retry loops)
  if (
    !(error instanceof Prisma.PrismaClientUnknownRequestError) ||
    !apiKey ||
    !isRetryable ||
    errorReq.headers.get("upstash-signature") != null
  ) {
    return;
  }

  const response = await qstash.publishJSON({
    url,
    method,
    body: await parseRequestBody(errorReq),
    headers: {
      ...Object.fromEntries(errorReq.headers.entries()),
    },
    delay: "10s",
    retries: 5,
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
