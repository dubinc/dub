import { Link } from "@prisma/client";
import { stripeAppClient } from ".";

export async function createPromotionCode({
  couponId,
  link,
  stripeAccount,
}: {
  couponId: string;
  link: Pick<Link, "key" | "partnerId">;
  stripeAccount: string;
}) {
  const stripe = stripeAppClient({
    livemode: process.env.NODE_ENV === "production",
  });

  try {
    const promotionCode = await stripe.promotionCodes.create(
      {
        coupon: couponId,
        code: link.key,
        metadata: {
          partnerId: link.partnerId,
        },
      },
      {
        stripeAccount,
      },
    );

    console.log(
      `Promotion code ${promotionCode.id} created for link ${link.key} for account ${stripeAccount}`,
    );

    return promotionCode;
  } catch (error) {
    console.error("Failed to create promotion code", error);
    throw error;
  }
}
