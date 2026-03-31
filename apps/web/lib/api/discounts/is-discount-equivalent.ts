import { Discount } from "@dub/prisma/client";

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
