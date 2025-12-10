import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { HTTPMethods } from "@upstash/qstash";
import { NextRequest } from "next/server";
import { qstash } from "../cron";
import { parseRequestBody } from "./utils";

const RETRYABLE_ENDPOINTS = [
  { method: "POST", path: "/api/track/lead" },
  { method: "POST", path: "/api/track/sale" },
  { method: "POST", path: "/api/links" },
] as const;

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
  const headers = Object.fromEntries(errorReq.headers.entries());
  const isRetryable = RETRYABLE_ENDPOINTS[method]?.has(url) ?? false;

  // Skip retry if: error is one of the below
  // - not a Prisma unknown request error
  // - no API key provided
  // - endpoint is not retryable
  // - request already has an upstash signature (to prevent retry loops)
  if (
    !(error instanceof Prisma.PrismaClientUnknownRequestError) ||
    !apiKey ||
    !isRetryable ||
    headers["upstash-signature"] != null
  ) {
    return;
  }

  const response = await qstash.publishJSON({
    url,
    method,
    body: await parseRequestBody(errorReq),
    headers: {
      ...Object.fromEntries(errorReq.headers.entries()),
      // Authorization: `Bearer ${await encryptToken(apiKey)}`,
    },
    delay: "10s",
    retries: 10,
  });

  if (response.messageId) {
    console.log("Request queued for retry", {
      method,
      url,
      messageId: response.messageId,
    });
  }
}
