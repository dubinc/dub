import { nanoid } from "@dub/utils";
import { stripeAppClient } from ".";
import { DiscountProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

const MAX_ATTEMPTS = 3;

export async function createStripeDiscountCode({
  stripeConnectId,
  discount,
  code,
  shouldRetry = true,
}: {
  stripeConnectId: string;
  discount: Pick<DiscountProps, "id" | "couponId" | "amount" | "type">;
  code: string;
  shouldRetry?: boolean; // we don't retry if the code is provided by the user
}) {
  if (!stripeConnectId) {
    throw new Error(
      `stripeConnectId is required to create a Stripe discount code.`,
    );
  }

  if (!discount.couponId) {
    throw new Error(`couponId not found for discount ${discount.id}.`);
  }

  let attempt = 0;
  let currentCode = code;

  while (attempt < MAX_ATTEMPTS) {
    try {
      return await stripe.promotionCodes.create(
        {
          coupon: discount.couponId,
          code: currentCode.toUpperCase(),
        },
        {
          stripeAccount: stripeConnectId,
        },
      );
    } catch (error: any) {
      const errorMessage = error.raw?.message || error.message;
      const isDuplicateError = errorMessage?.includes("already exists");

      if (!isDuplicateError) {
        throw error;
      }

      if (!shouldRetry) {
        throw error;
      }

      attempt++;

      if (attempt >= MAX_ATTEMPTS) {
        throw error;
      }

      const newCode = constructDiscountCode({
        code: currentCode,
        discount,
      });

      console.warn(
        `Discount code "${currentCode}" already exists. Retrying with "${newCode}" (attempt ${attempt}/${MAX_ATTEMPTS}).`,
      );

      currentCode = newCode;
    }
  }
}

export function constructDiscountCode({
  code,
  discount,
}: {
  code: string;
  discount: Pick<DiscountProps, "amount" | "type">;
}) {
  const amount =
    discount.type === "percentage" ? discount.amount : discount.amount / 100;

  if (!code.endsWith(amount.toString())) {
    return `${code}${amount}`;
  }

  return `${code}${nanoid(4)}`;
}
