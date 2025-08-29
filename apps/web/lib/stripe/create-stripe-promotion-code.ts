import { prisma } from "@dub/prisma";
import { stripeAppClient } from ".";
import { DiscountProps, LinkProps, WorkspaceProps } from "../types";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { livemode: true }),
});

const MAX_RETRIES = 3;

export async function createStripePromotionCode({
  workspace,
  discount,
  link,
}: {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
  discount: Pick<
    DiscountProps,
    "id" | "couponId" | "amount" | "type" | "couponCodeTrackingEnabledAt"
  >;
  link: Pick<LinkProps, "id" | "key" | "couponCode">;
}) {
  if (!discount.couponCodeTrackingEnabledAt) {
    console.log(
      `Coupon code tracking is not enabled for discount ${discount.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  if (link.couponCode) {
    console.log(
      `Promotion code ${link.couponCode} already exists for link ${link.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  if (!workspace.stripeConnectId) {
    console.error(
      `stripeConnectId not found for the workspace ${workspace.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  if (!discount.couponId) {
    console.error(
      `couponId not found for the discount ${discount.id}. Stripe promotion code creation skipped.`,
    );
    return;
  }

  let lastError: Error | null = null;
  let couponCode: string | undefined;

  const amount =
    discount.type === "percentage" ? discount.amount : discount.amount / 100;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      couponCode = attempt === 1 ? link.key : `${link.key}${amount}`; // eg: DAVID30

      const promotionCode = await stripe.promotionCodes.create(
        {
          coupon: discount.couponId,
          code: couponCode.toUpperCase(),
        },
        {
          stripeAccount: workspace.stripeConnectId,
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

        console.info(
          `Created promotion code ${promotionCode.code} (discount=${discount.id}, link=${link.id})`,
        );
      }

      return promotionCode;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isDuplicateError =
        error instanceof Error &&
        error.message.includes("An active promotion code with `code:") &&
        error.message.includes("already exists");

      console.error(error.message);

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
