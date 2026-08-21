import { Discount } from "@prisma/client";

type DiscountEquivalenceFields = Pick<
  Discount,
  "couponId" | "provider" | "amount" | "type" | "maxDuration"
>;

export function isDiscountEquivalent(
  firstDiscount: DiscountEquivalenceFields | null | undefined,
  secondDiscount: DiscountEquivalenceFields | null | undefined,
): boolean {
  if (!firstDiscount || !secondDiscount) {
    return false;
  }

  if (firstDiscount.provider !== secondDiscount.provider) {
    return false;
  }

  // If both groups use the same coupon
  if (
    firstDiscount.couponId &&
    secondDiscount.couponId &&
    firstDiscount.couponId === secondDiscount.couponId
  ) {
    return true;
  }

  // If both discounts are effectively equivalent
  return (
    firstDiscount.provider === secondDiscount.provider &&
    firstDiscount.amount === secondDiscount.amount &&
    firstDiscount.type === secondDiscount.type &&
    firstDiscount.maxDuration === secondDiscount.maxDuration
  );
}
