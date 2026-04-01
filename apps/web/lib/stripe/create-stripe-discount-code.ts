import { nanoid } from "@dub/utils";
import { stripeAppClient } from ".";
import { DiscountProps, StripeMode } from "../types";

const MAX_ATTEMPTS = 3;

export async function createStripeDiscountCode({
  stripeConnectId,
  stripeMode,
  discount,
  code,
  shouldRetry = true,
}: {
  stripeConnectId: string;
  stripeMode: StripeMode;
  discount: Pick<DiscountProps, "id" | "couponId" | "amount" | "type">;
  code: string;
  shouldRetry?: boolean; // we don't retry if the code is provided by the user
}) {
  if (!stripeConnectId) {
    throw new Error(
      `stripeConnectId is required to create a Stripe discount code.`,
    );
  }

  const stripe = stripeAppClient({
    mode: stripeMode,
  });

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
          restrictions: {
            first_time_transaction: true,
          },
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

      const newCode = `${currentCode}${nanoid(2)}`;

      console.warn(
        `Discount code "${currentCode}" already exists. Retrying with "${newCode}" (attempt ${attempt}/${MAX_ATTEMPTS}).`,
      );

      currentCode = newCode;
    }
  }

  throw new Error("Failed to create Stripe discount code.");
}
