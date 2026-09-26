import { getDiscountCode } from "@/lib/api/partners/get-discount-code";
import { softDeleteDiscountCodes } from "@/lib/discounts/soft-delete-discount-codes";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";

// Handle event "promotion_code.updated"
export async function promotionCodeUpdated({
  event,
  workspace,
}: Omit<
  WebhookHandlerInput<Stripe.PromotionCodeUpdatedEvent>,
  "mode"
>): Promise<WebhookHandlerResponse> {
  const promotionCode = event.data.object;
  const stripeAccountId = event.account as string;

  if (!workspace.defaultProgramId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`,
    };
  }

  if (promotionCode.active) {
    return {
      response: `Promotion code ${promotionCode.id} is active, no action needed.`,
    };
  }

  const discountCode = await getDiscountCode({
    where: {
      programId: workspace.defaultProgramId,
      code: promotionCode.code,
    },
  });

  if (!discountCode) {
    return {
      response: `Discount code not found for Stripe promotion code ${promotionCode.id}.`,
    };
  }

  await softDeleteDiscountCodes({
    where: {
      id: discountCode.id,
    },
  });

  return {
    response: `Discount code ${discountCode.id} deleted from the program ${workspace.defaultProgramId}.`,
  };
}
