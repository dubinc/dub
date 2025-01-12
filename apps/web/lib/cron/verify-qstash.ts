import { Receiver } from "@upstash/qstash";
import { DubApiError } from "../api/errors";

// we're using Upstash's Receiver to verify the request signature
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export const verifyQstashSignature = async ({
  req,
  body,
  bodyType = "json",
}: {
  req: Request;
  body?: any;
  // due to a weird QStash bug, webhook URLs that have query params
  // need to be verified with the text body type (instead of JSON)
  bodyType?: "json" | "text";
}) => {
  body = body || (bodyType === "json" ? await req.json() : await req.text());

  const isValid = await receiver.verify({
    signature: req.headers.get("Upstash-Signature") || "",
    body: bodyType === "json" ? JSON.stringify(body) : body,
  });

  if (!isValid) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid QStash request signature",
    });
  }
};
