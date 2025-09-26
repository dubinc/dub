import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "promotion_code.updated"
export async function promotionCodeUpdated(event: Stripe.Event) {
  const promotionCode = event.data.object as Stripe.PromotionCode;
  const stripeAccountId = event.account as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      slug: true,
      defaultProgramId: true,
      stripeConnectId: true,
    },
  });

  if (!workspace) {
    return `Workspace not found for Stripe account ${stripeAccountId}.`;
  }

  if (!workspace.defaultProgramId) {
    return `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`;
  }

  if (promotionCode.active) {
    return `Promotion code ${promotionCode.id} is active.`;
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
    return `Discount code not found for Stripe promotion code ${promotionCode.id}.`;
  }

  await prisma.discountCode.delete({
    where: {
      id: discountCode.id,
    },
  });

  return `Discount code ${discountCode.id} deleted from the program ${workspace.defaultProgramId}.`;
}
