import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned / deactivated
// 4. When a partner is moved to a different group
export async function queueDiscountCodeDeletion(
  input: string | string[] | undefined,
) {
  const discountCodeIds = Array.isArray(input) ? input : [input];

  if (discountCodeIds.length === 0) {
    return;
  }

  await queue.upsert({
    parallelism: 10,
  });

  // TODO:
  // Check if we can use the batchJSON (I tried it but didn't work)

  const chunks = chunk(discountCodeIds, 100);

  for (const chunkOfIds of chunks) {
    await Promise.allSettled(
      chunkOfIds.map((discountCodeId) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/${discountCodeId}/delete`,
          method: "POST",
        }),
      ),
    );
  }
}
