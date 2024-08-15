import { createHmac } from "crypto";
import { getSlackEnv } from "./env";

interface SlackRequestVerificationOptions {
  signingSecret: string;
  body: string;
  nowMilliseconds?: number;
  headers: {
    "x-slack-signature": string;
    "x-slack-request-timestamp": number;
  };
}

// Verifies the signature of an incoming request from Slack.
export const verifySlackSignature = async (req: Request, body: string) => {
  const env = getSlackEnv();

  const options: SlackRequestVerificationOptions = {
    signingSecret: env.SLACK_SIGNING_SECRET,
    body: body,
    headers: {
      "x-slack-signature": req.headers.get("x-slack-signature") ?? "",
      "x-slack-request-timestamp": Number(
        req.headers.get("x-slack-request-timestamp"),
      ),
    },
  };

  const verifyErrorPrefix = "Failed to verify authenticity";
  const requestTimestampSec = options.headers["x-slack-request-timestamp"];
  const signature = options.headers["x-slack-signature"];

  if (Number.isNaN(requestTimestampSec)) {
    throw new Error(
      `${verifyErrorPrefix}: header x-slack-request-timestamp did not have the expected type (${requestTimestampSec})`,
    );
  }

  // Calculate time-dependent values
  const nowMs = options.nowMilliseconds ?? Date.now();
  const requestTimestampMaxDeltaMin = 5;
  const fiveMinutesAgoSec =
    Math.floor(nowMs / 1000) - 60 * requestTimestampMaxDeltaMin;

  // Rule 1: Check staleness
  if (requestTimestampSec < fiveMinutesAgoSec) {
    throw new Error(
      `${verifyErrorPrefix}: x-slack-request-timestamp must differ from system time by no more than ${requestTimestampMaxDeltaMin} minutes or request is stale`,
    );
  }

  // Rule 2: Check signature
  const [signatureVersion, signatureHash] = signature.split("=");

  // Only handle known versions
  if (signatureVersion !== "v0") {
    throw new Error(`${verifyErrorPrefix}: unknown signature version`);
  }

  // Compute our own signature hash
  const hmac = createHmac("sha256", options.signingSecret);
  hmac.update(`${signatureVersion}:${requestTimestampSec}:${options.body}`);
  const expectedSignature = hmac.digest("hex");

  if (!signatureHash || signatureHash !== expectedSignature) {
    throw new Error(`${verifyErrorPrefix}: signature mismatch`);
  }
};
