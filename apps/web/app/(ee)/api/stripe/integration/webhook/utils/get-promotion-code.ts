import { stripeAppClient } from "@/lib/stripe";

export async function getPromotionCode({
  promotionCodeId,
  stripeAccountId,
  livemode = true,
}: {
  promotionCodeId?: string | null;
  stripeAccountId?: string | null;
  livemode?: boolean;
}) {
  if (!stripeAccountId || !promotionCodeId) {
    return null;
  }

  try {
    return await stripeAppClient({
      livemode,
    }).promotionCodes.retrieve(promotionCodeId, {
      stripeAccount: stripeAccountId,
    });
  } catch (error) {
    console.log("Failed to get promotion code:", error);
    return null;
  }
}
