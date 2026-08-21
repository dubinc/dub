import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { intercomWebhookSchema } from "@/lib/integrations/intercom/schema";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../cron/utils";
import { verifyIntercomWebhookSignature } from "./verify-webhook-signature";

const relevantTopics = new Set(["conversation.admin.replied", "ping"]);

// POST /api/intercom/webhook – listen to webhook events from Intercom
export const POST = withAxiom(async (req) => {
  try {
    const rawBody = await verifyIntercomWebhookSignature(req);
    const body = JSON.parse(rawBody);

    const { topic } = intercomWebhookSchema.parse(body);

    if (!relevantTopics.has(topic)) {
      return logAndRespond(`[Intercom] Unsupported topic: ${topic}.`);
    }

    if (topic === "ping") {
      return logAndRespond("Received ping event. No action required.");
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
