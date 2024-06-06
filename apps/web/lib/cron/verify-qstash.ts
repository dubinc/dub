import { Receiver } from "@upstash/qstash";
import { DubApiError } from "../api/errors";

// we're using Upstash's Receiver to verify the request signature
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export const verifyQstashSignature = async (
  req: Request,
  body?: Record<string, unknown>,
) => {
  body = body || (await req.json());

  const isValid = await receiver.verify({
    signature: req.headers.get("Upstash-Signature") || "",
    body: JSON.stringify(body),
  });

  if (!isValid) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid QStash request signature",
    });
  }
};
