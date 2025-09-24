import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When coupon tracking is disabled for a discount
// 3. When a link is deleted that has a discount code associated with it
export async function queueDiscountCodeDeletion({
  discountId,
  discountCodeId,
}: {
  discountId?: string;
  discountCodeId?: string;
}) {
  await queue.upsert({
    parallelism: 10,
  });

  // Delete a discount code
  if (discountCodeId) {
    return await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
      method: "POST",
      body: {
        discountCodeId,
      },
    });
  }

  // Delete all codes for a discount
  if (discountId) {
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

      console.log("discountCodes", discountCodes);

      const response = await Promise.allSettled(
        discountCodes.map(({ id }) =>
          queue.enqueueJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
            method: "POST",
            body: {
              discountCodeId: id,
            },
          }),
        ),
      );

      console.log("response", response);

      cursor = discountCodes[discountCodes.length - 1].id;
    }
  }
}
