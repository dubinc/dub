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
    return {
      response: `Workspace not found for Stripe account ${stripeAccountId}, skipping...`,
    };
  }

  const workspaceId = workspace.id;

  if (!workspace.defaultProgramId) {
    return {
      response: `Workspace ${workspaceId} for stripe account ${stripeAccountId} has no programs.`,
      workspaceId,
    };
  }

  if (promotionCode.active) {
    return {
      response: `Promotion code ${promotionCode.id} is active.`,
      workspaceId,
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
      workspaceId,
    };
  }

  await prisma.discountCode.delete({
    where: {
      id: discountCode.id,
    },
  });

  return {
    response: `Discount code ${discountCode.id} deleted from the program ${workspace.defaultProgramId}.`,
    workspaceId,
  };
}
