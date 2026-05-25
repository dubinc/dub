import { log } from "@dub/utils";
import { Receiver } from "@upstash/qstash";
import { DubApiError } from "../api/errors";

// we're using Upstash's Receiver to verify the request signature
const receiver = new Receiver();

export const verifyQstashSignature = async ({
  req,
  rawBody,
}: {
  req: Request;
  rawBody: string; // Make sure to pass the raw body not the parsed JSON
}) => {
  // skip verification in local development
  if (process.env.VERCEL !== "1") {
    return;
  }

  const signature = req.headers.get("Upstash-Signature");

  if (!signature) {
    throw new DubApiError({
      code: "bad_request",
      message: "Upstash-Signature header not found.",
    });
  }

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    // Pass the region header for multi-region support
    upstashRegion: req.headers.get("upstash-region") ?? undefined,
  });

  if (!isValid) {
    const url = req.url;
    const messageId = req.headers.get("Upstash-Message-Id");

    log({
      message: `Invalid QStash request signature: *${url}* - *${messageId}*`,
      type: "errors",
      mention: true,
    });

    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid QStash request signature.",
    });
  }
};
