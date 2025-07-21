import { deleteDiscount } from "@/lib/api/partners/delete-discount";
import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

// Handle event "coupon.deleted"
export async function couponDeleted(event: Stripe.Event) {
  const coupon = event.data.object as Stripe.Coupon;
  const stripeAccountId = event.account as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
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

  const discount = await prisma.discount.findFirst({
    where: {
      programId: workspace.defaultProgramId,
      couponId: coupon.id,
    },
  });

  if (!discount) {
    return `Discount not found for Stripe coupon ${coupon.id}.`;
  }

  const deletedDiscountId = await deleteDiscount({
    workspace,
    discount,
  });

  if (deletedDiscountId) {
    return `Discount ${deletedDiscountId} deleted.`;
  }

  return `Failed to delete discount ${discount.id}.`;
}
