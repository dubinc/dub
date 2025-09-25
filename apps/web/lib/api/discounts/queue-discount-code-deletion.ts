import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Discount } from "@prisma/client";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When partners are banned
// 4. When a partner is moved to a different group
export async function queueDiscountCodeDeletion(
  discountCodeId: string | null | undefined,
) {
  if (!discountCodeId) {
    return;
  }

  await queue.upsert({
    parallelism: 10,
  });

  await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
    method: "POST",
    body: {
      discountCodeId,
    },
  });
}

export function isDiscountEquivalent(
  firstDiscount: Discount | null | undefined,
  secondDiscount: Discount | null | undefined,
): boolean {
  if (!firstDiscount || !secondDiscount) {
    return false;
  }

  // If both groups use the same Stripe coupon
  if (firstDiscount.couponId === secondDiscount.couponId) {
    return true;
  }

  // If both discounts are effectively equivalent
  if (
    firstDiscount.amount === secondDiscount.amount &&
    firstDiscount.type === secondDiscount.type &&
    firstDiscount.maxDuration === secondDiscount.maxDuration
  ) {
    return true;
  }

  return false;
}
