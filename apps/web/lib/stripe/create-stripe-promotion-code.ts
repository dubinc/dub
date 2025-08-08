import { prisma } from "@dub/prisma";
import { stripeAppClient } from ".";
import { LinkProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

const MAX_RETRIES = 2;

export async function createStripePromotionCode({
  link,
  couponId,
  stripeConnectId,
}: {
  link: Pick<LinkProps, "id" | "key">;
  couponId: string | null;
  stripeConnectId: string | null;
}) {
  if (!couponId) {
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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add DUB_ prefix after first retry
      couponCode = attempt === 1 ? link.key : `DUB_${link.key}`;

      const promotionCode = await stripe.promotionCodes.create(
        {
          coupon: couponId,
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
