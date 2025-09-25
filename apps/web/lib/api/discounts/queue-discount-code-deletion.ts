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
export async function queueStripeDiscountCodeDisable({
  code,
  stripeConnectId,
}: Payload) {
  if (!stripeConnectId) {
    return;
  }

  await queue.upsert({
    parallelism: 10,
  });

  await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/disable-stripe-code`,
    method: "POST",
    body: {
      code,
      stripeConnectId,
    },
  });
}

// For a given discount, we'll delete the discount codes in batches
export async function batchQueueStripeDiscountCodeDisable({
  discountId,
  stripeConnectId,
}: {
  discountId: string;
  stripeConnectId: string | null | undefined;
}) {
  if (!stripeConnectId) {
    return;
  }

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

    // TODO:
    // Talk to Upstash to see if there is a way to batch send this

    if (discountCodes.length === 0) {
      break;
    }

    await Promise.allSettled(
      discountCodes.map(({ code }) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/disable-stripe-code`,
          method: "POST",
          body: {
            code,
            stripeConnectId,
          },
        }),
      ),
    );

    cursor = discountCodes[discountCodes.length - 1].id;
  }
}
