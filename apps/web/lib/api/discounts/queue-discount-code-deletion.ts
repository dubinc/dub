import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, isRejected } from "@dub/utils";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});


interface QueueDiscountCodeDeletionInput {
  code: string;
  
}

export async function queueDiscountCodeDeletion() {
  await queue.upsert({
    parallelism: 10,
  });

  const response = await Promise.allSettled(
    codes.map((code) =>
      queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete-coupon-code`,
        method: "POST",
        body: {
          code,
        },
      }),
    ),
  );
}
