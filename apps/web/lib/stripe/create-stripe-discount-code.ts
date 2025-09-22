import { nanoid } from "@dub/utils";
import { stripeAppClient } from ".";
import { DiscountProps, WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

const MAX_ATTEMPTS = 3;

export async function createStripeDiscountCode({
  workspace,
  discount,
  code,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  discount: Pick<DiscountProps, "id" | "couponId" | "amount" | "type">;
  code: string;
}) {
  if (!workspace.stripeConnectId) {
    throw new Error(
      `stripeConnectId not found for workspace ${workspace.id}. Stripe promotion code creation skipped.`,
    );
  }

  if (!discount.couponId) {
    throw new Error(
      `couponId not found for discount ${discount.id}. Stripe promotion code creation skipped.`,
    );
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
          stripeAccount: workspace.stripeConnectId,
        },
      );
    } catch (error: any) {
      const errorMessage = error.raw?.message || error.message;
      const isDuplicateError = errorMessage?.includes("already exists");

      if (!isDuplicateError) {
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
