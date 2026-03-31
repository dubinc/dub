import { qstash } from "@/lib/cron";
import { ResendEmailOptions } from "@dub/email/resend/types";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { EMAIL_TEMPLATES_MAP } from "./email-templates-map";

type QueueBatchProps<TTemplate extends (props: any) => any> =
  ResendEmailOptions & {
    templateName: keyof typeof EMAIL_TEMPLATES_MAP;
    templateProps: Parameters<TTemplate>[0];
  };

const BATCH_SIZE = 100;

const queue = qstash.queue({
  queueName: "send-batch-email",
});

export async function queueBatchEmail<TTemplate extends (props: any) => any>(
  emails: QueueBatchProps<TTemplate>[],
  options?: {
    idempotencyKey?: string; // Used for both QStash deduplication AND Resend idempotency
  },
): Promise<string[]> {
  // filter out emails without a `to` address
  emails = emails.filter((email) => Boolean(email.to));

  if (emails.length === 0) {
    console.log("No emails to queue. Skipping...");
    return [];
  }

  try {
    // Chunk emails into batches of BATCH_SIZE
    const batches = chunk(emails, BATCH_SIZE);
    const messageIds: string[] = [];

    // Enqueue each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Generate batch-specific idempotency key
      const idempotencyKey = options?.idempotencyKey
        ? batches.length > 1
          ? `${options.idempotencyKey}-batch-${i}`
          : options.idempotencyKey
        : undefined;

      const response = await queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/send-batch-email`,
        method: "POST",
        body: batch,
        ...(idempotencyKey && {
          deduplicationId: idempotencyKey, // QStash deduplication
        }),
        ...(idempotencyKey && {
          headers: {
            "Idempotency-Key": idempotencyKey, // Resend idempotency
          },
        }),
      });

      messageIds.push(response.messageId);

      console.log(
        `Enqueued batch ${i + 1}/${batches.length} with ${batch.length} email(s):`,
        {
          messageId: response.messageId,
          ...(idempotencyKey && { idempotencyKey }),
        },
      );
    }

    console.log(
      `Queued ${emails.length} email(s) in ${batches.length} batch(es)`,
    );

    return messageIds;
  } catch (error) {
    await log({
      message: `Failed to queue batch emails: ${error.message}`,
      type: "errors",
      mention: true,
    });

    throw error;
  }
}
