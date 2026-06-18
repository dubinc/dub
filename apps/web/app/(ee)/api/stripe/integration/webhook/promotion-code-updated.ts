import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { StripeWebhookInput, StripeWebhookOutput } from "./utils/types";

// Handle event "promotion_code.updated"
export async function promotionCodeUpdated({
  event,
  workspace,
}: Omit<StripeWebhookInput, "mode"> & {
  event: Stripe.PromotionCodeUpdatedEvent;
}): Promise<StripeWebhookOutput> {
  const promotionCode = event.data.object;

  if (!workspace.defaultProgramId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${workspace.stripeConnectId} has no programs.`,
    };
  }

  if (promotionCode.active) {
    return {
      response: `Promotion code ${promotionCode.id} is active, no action needed.`,
    };
  }

  // If the promotion code is not active, we need to remove them from Dub
  const discountCode = await prisma.discountCode.findUnique({
    where: {
      programId_code: {
        programId: workspace.defaultProgramId,
        code: promotionCode.code,
      },
    },
  });

  if (!discountCode) {
    return {
      response: `Discount code not found for Stripe promotion code ${promotionCode.id}.`,
    };
  }

  await prisma.discountCode.delete({
    where: {
      id: discountCode.id,
    },
  });

  return {
    response: `Discount code ${discountCode.id} deleted from the program ${workspace.defaultProgramId}.`,
  };
}
