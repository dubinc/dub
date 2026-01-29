import { qstash } from "@/lib/cron";
import { DiscountCode } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";

const queue = qstash.queue({
  queueName: "delete-discount-code",
});

type QueueDiscountCodeParams =
  | Pick<DiscountCode, "code" | "programId">
  | Pick<DiscountCode, "code" | "programId">[];

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned / deactivated
// 4. When a partner is moved to a different group
export async function queueDiscountCodeDeletion(
  input: QueueDiscountCodeParams,
) {
  const discountCodes = Array.isArray(input) ? input : [input];

  if (discountCodes.length === 0) {
    return;
  }

  // TODO:
  // Check if we can use the batchJSON (I tried it but didn't work)

  const chunks = chunk(discountCodes, 100);

  for (const chunkOfCodes of chunks) {
    await Promise.allSettled(
      chunkOfCodes.map((discountCode) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/delete`,
          method: "POST",
          body: {
            code: discountCode.code,
            programId: discountCode.programId,
          },
        }),
      ),
    );
  }
}
