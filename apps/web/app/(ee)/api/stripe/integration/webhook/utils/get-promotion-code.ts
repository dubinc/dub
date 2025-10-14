import { stripeAppClient } from "@/lib/stripe";
import { StripeMode } from "@/lib/types";

export async function getPromotionCode({
  promotionCodeId,
  stripeAccountId,
  mode,
}: {
  promotionCodeId?: string | null;
  stripeAccountId?: string | null;
  mode: StripeMode;
}) {
  if (!stripeAccountId || !promotionCodeId) {
    return null;
  }

  try {
    return await stripeAppClient({ mode }).promotionCodes.retrieve(
      promotionCodeId,
      {
        stripeAccount: stripeAccountId,
      },
    );
  } catch (error) {
    console.log("Failed to get promotion code:", error);
    return null;
  }
}
