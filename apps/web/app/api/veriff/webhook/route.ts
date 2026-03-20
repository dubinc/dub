import { veriffEventSchema } from "@/lib/veriff/schema";
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
    return new Response("No signature provided.", { status: 401 });
  }

  if (authClient !== process.env.VERIFF_API_KEY) {
    return new Response("Invalid auth client.", { status: 401 });
  }

  if (!webhookSecret) {
    return new Response("VERIFF_WEBHOOK_SECRET is not configured.", {
      status: 500,
    });
  }

  const computedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (computedSignature !== signature) {
    return new Response("Invalid signature.", { status: 400 });
  }

  const body = JSON.parse(rawBody);
  const result = veriffEventSchema.safeParse(body);

  if (!result.success) {
    console.error("[Veriff Webhook] Invalid payload:", result.error);
    return new Response("Invalid payload.", { status: 400 });
  }

  console.log("[Veriff Webhook] payload:", result.data);

  if ("code" in result.data) {
    await handleSessionEvent(result.data);
  } else {
    await handleDecisionEvent(result.data);
  }

  return new Response("OK");
};
