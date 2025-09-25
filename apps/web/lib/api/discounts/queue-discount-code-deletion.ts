import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Discount } from "@prisma/client";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

// Triggered in the following cases:
// 1. When a discount is deleted
// 2. When a link is deleted that has a discount code associated with it
// 3. When a partner is banned
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
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/disable-stripe-code`,
    method: "POST",
    body: {
      discountCodeId,
    },
  });
}

// Determine if we should delete the discount code from Stripe
// Used in the following cases:
// 1. When a group is deleted
// 2. When a partner is moved to a different group
// export function shouldDeleteStripeDiscountCode({
//   groupDiscount,
//   defaultGroupDiscount,
// }: {
//   groupDiscount: Discount | null | undefined;
//   defaultGroupDiscount: Discount | null | undefined;
// }): boolean {
//   if (!groupDiscount || !defaultGroupDiscount) {
//     return true;
//   }

//   // If both groups use the same Stripe coupon
//   if (groupDiscount.couponId === defaultGroupDiscount.couponId) {
//     return false;
//   }

//   // If both discounts are effectively equivalent
//   if (
//     groupDiscount.amount === defaultGroupDiscount.amount &&
//     groupDiscount.type === defaultGroupDiscount.type &&
//     groupDiscount.maxDuration === defaultGroupDiscount.maxDuration
//   ) {
//     return false;
//   }

//   return true;
// }

export function shouldKeepStripeDiscountCode({
  groupDiscount,
  defaultGroupDiscount,
}: {
  groupDiscount: Discount | null | undefined;
  defaultGroupDiscount: Discount | null | undefined;
}): boolean {
  if (!groupDiscount || !defaultGroupDiscount) {
    return false;
  }

  // If both groups use the same Stripe coupon
  if (groupDiscount.couponId === defaultGroupDiscount.couponId) {
    return true;
  }

  // If both discounts are effectively equivalent
  if (
    groupDiscount.amount === defaultGroupDiscount.amount &&
    groupDiscount.type === defaultGroupDiscount.type &&
    groupDiscount.maxDuration === defaultGroupDiscount.maxDuration
  ) {
    return true;
  }

  return false;
}
