import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

interface Payload {
  code: string | null | undefined;
  stripeConnectId: string | null | undefined;
}

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When coupon tracking is disabled for a discount
// 3. When a link is deleted that has a discount code associated with it
// 4. When a partner is banned
// 5. When a partner is moved to a different group
export async function queueDiscountCodeDeletion({
  code,
  stripeConnectId,
}: Payload) {
  await queue.upsert({
    parallelism: 10,
  });

  const response = await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
    method: "POST",
    body: {
      code,
      stripeConnectId,
    },
  });
}

export async function batchQueueDiscountCodeDeletion({
  discountId,
  stripeConnectId
}: {
  discountId: string,
  stripeConnectId: string,
}) {
  let cursor: undefined | string = undefined;

  while (true) {
    const discountCodes = await prisma.discountCode.findMany({
      where: {
        discountId,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      cursor: {
        id: cursor,
      },
      take: 100,
    });

    if (discountCodes.length === 0) {
      break;
    }

    await Promise.allSettled(
      discountCodes.map(({ id }) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
          method: "POST",
          body: {
            
          },
        }),
      ),
    );

    cursor = discountCodes[discountCodes.length - 1].id;
  }
}
