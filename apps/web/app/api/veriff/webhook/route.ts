import { logAndRespond } from "app/(ee)/api/cron/utils";
import crypto from "crypto";
import { handleDecisionEvent } from "./handle-decision-event";
import { handleSessionEvent } from "./handle-session-event";

// POST /api/veriff/webhook
export const POST = async (req: Request) => {
  const rawBody = await req.text();

  const signature = req.headers.get("x-hmac-signature");
  const authClient = req.headers.get("x-auth-client");
  const webhookSecret = process.env.VERIFF_WEBHOOK_SECRET;

  if (!signature) {
    return logAndRespond("No signature provided.", { status: 401 });
  }

  if (authClient !== process.env.VERIFF_API_KEY) {
    return logAndRespond("Invalid auth client.", { status: 401 });
  }

  if (!webhookSecret) {
    return logAndRespond("VERIFF_WEBHOOK_SECRET is not configured.", {
      status: 500,
    });
  }

  const computedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (computedSignature !== signature) {
    return logAndRespond("Invalid signature.", { status: 400 });
  }

  const body = JSON.parse(rawBody);

  if ("verification" in body) {
    return await handleDecisionEvent(body);
  } else {
    return await handleSessionEvent(body);
  }
};
