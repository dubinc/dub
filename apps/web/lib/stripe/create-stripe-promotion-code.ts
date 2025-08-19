import { prisma } from "@dub/prisma";
import { stripeAppClient } from ".";
import { DiscountProps, LinkProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

const MAX_RETRIES = 2;

export async function createStripePromotionCode({
  link,
  coupon,
  stripeConnectId,
}: {
  link: Pick<LinkProps, "id" | "key">;
  coupon: Pick<DiscountProps, "couponId" | "amount" | "type">;
  stripeConnectId: string | null;
}) {
  if (!coupon.couponId) {
    console.error(
      "couponId not found for the discount. Stripe promotion code creation skipped.",
    );
    return;
  }

  if (!stripeConnectId) {
    console.error(
      "stripeConnectId not found for the workspace. Stripe promotion code creation skipped.",
    );
    return;
  }

  let lastError: Error | null = null;
  let couponCode: string | undefined;

  const amount =
    coupon.type === "percentage" ? coupon.amount : coupon.amount / 100;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      couponCode = attempt === 1 ? link.key : `${link.key}${amount}`; // eg: DAVID30

      const promotionCode = await stripe.promotionCodes.create(
        {
          coupon: coupon.couponId,
          code: couponCode.toUpperCase(),
        },
        {
          stripeAccount: stripeConnectId,
        },
      );

      if (promotionCode) {
        await prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            couponCode: promotionCode.code,
          },
        });
      }

      return promotionCode;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(lastError);

      const isDuplicateError =
        error instanceof Error &&
        error.message.includes("An active promotion code with `code:") &&
        error.message.includes("already exists");

      if (isDuplicateError) {
        if (attempt === MAX_RETRIES) {
          throw lastError;
        }

        continue;
      }

      throw lastError;
    }
  }

  throw (
    lastError ||
    new Error("Unknown error occurred while creating promotion code on Stripe.")
  );
}
