import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { intercomWebhookSchema } from "@/lib/integrations/intercom/schema";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import crypto from "crypto";
import { logAndRespond } from "../../cron/utils";

const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";

const relevantTopics = new Set(["conversation.admin.replied"]);

// POST /api/intercom/webhook – listen to webhook events from Intercom
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Hub-Signature");

    if (!signature) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing X-Hub-Signature header.",
      });
    }

    if (!INTERCOM_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing INTERCOM_CLIENT_SECRET environment variable.",
      });
    }

    const expectedSignature =
      "sha1=" +
      crypto
        .createHmac("sha1", INTERCOM_CLIENT_SECRET)
        .update(rawBody)
        .digest("hex");

    const isSignatureValid = crypto.timingSafeEqual(
      Uint8Array.from(Buffer.from(signature, "utf8")),
      Uint8Array.from(Buffer.from(expectedSignature, "utf8")),
    );

    if (!isSignatureValid) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid webhook signature.",
      });
    }

    const body = JSON.parse(rawBody);
    const { topic } = intercomWebhookSchema.parse(body);

    if (!relevantTopics.has(topic)) {
      return logAndRespond(`[Intercom] Unsupported topic: ${topic}.`);
    }

    const qstashResponse = await enqueueBatchJobs([
      {
        queueName: "process-intercom-webhook",
        url: `${APP_DOMAIN_WITH_NGROK}/api/intercom/webhook/process`,
        method: "POST",
        body,
      },
    ]);

    console.log(
      `[intercom/webhook] Enqueued webhook event to be processed.`,
      qstashResponse,
    );

    return logAndRespond("Webhook received.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
