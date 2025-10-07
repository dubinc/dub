import { RewardStructure } from "@dub/prisma/client";
import { Stripe } from "stripe";

/**
 * Type definitions for conversion functions
 */
export interface DubDiscountAttributes {
  amount: number;
  type: RewardStructure;
  maxDuration: number | null;
  description?: string | null;
}

/**
 * Convert Dub Discount attributes to Stripe Coupon attributes
 */
export function dubDiscountToStripeCoupon(
  discount: DubDiscountAttributes & { name?: string },
): Stripe.CouponCreateParams {
  let duration: "once" | "repeating" | "forever" = "once";
  let durationInMonths: number | undefined = undefined;

  // Convert maxDuration to Stripe duration format
  if (discount.maxDuration === null) {
    duration = "forever";
  } else if (discount.maxDuration === 0) {
    duration = "once";
  } else {
    duration = "repeating";
    durationInMonths = discount.maxDuration;
  }

  const stripeCouponData: Stripe.CouponCreateParams = {
    currency: "usd",
    duration,
    ...(duration === "repeating" &&
      durationInMonths && {
        duration_in_months: durationInMonths,
      }),
    ...(discount.type === "percentage"
      ? { percent_off: discount.amount }
      : { amount_off: discount.amount }),
    ...(discount.name && { name: discount.name }),
  };

  return stripeCouponData;
}

/**
 * Convert Stripe Coupon attributes to Dub Discount attributes
 */
export function stripeCouponToDubDiscount(
  stripeCoupon: Stripe.Coupon,
): DubDiscountAttributes {
  // Determine discount type and amount
  const type: RewardStructure = stripeCoupon.percent_off
    ? "percentage"
    : "flat";
  const amount = stripeCoupon.percent_off || stripeCoupon.amount_off || 0;

  // Convert Stripe duration to Dub maxDuration
  let maxDuration: number | null = null;

  switch (stripeCoupon.duration) {
    case "once":
      maxDuration = 0;
      break;
    case "forever":
      maxDuration = null;
      break;
    case "repeating":
      maxDuration = stripeCoupon.duration_in_months || 1;
      break;
  }

  return {
    amount,
    type,
    maxDuration,
    description: stripeCoupon.name || null,
  };
}

/**
 * Validate that a Stripe coupon can be converted to a Dub discount
 */
export function validateStripeCouponForDubDiscount(
  stripeCoupon: Stripe.Coupon,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if coupon has either percent_off or amount_off
  if (!stripeCoupon.percent_off && !stripeCoupon.amount_off) {
    errors.push("Coupon must have either percent_off or amount_off");
  }

  // Check if coupon has both percent_off and amount_off (invalid)
  if (stripeCoupon.percent_off && stripeCoupon.amount_off) {
    errors.push("Coupon cannot have both percent_off and amount_off");
  }

  // Check currency for amount_off coupons
  if (stripeCoupon.amount_off && stripeCoupon.currency !== "usd") {
    errors.push("Amount-based coupons must use USD currency");
  }

  // Check if coupon is valid (not deleted)
  if (stripeCoupon.valid === false) {
    errors.push("Coupon is not valid or has been deleted");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
