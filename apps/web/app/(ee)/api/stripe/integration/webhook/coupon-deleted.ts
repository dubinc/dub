import { deleteDiscount } from "@/lib/api/partners/delete-discount";
import { sendEmail } from "@dub/email";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
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

  const discount = await prisma.discount.findUnique({
    where: {
      programId_couponId: {
        programId: workspace.defaultProgramId,
        couponId: coupon.id,
      },
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
    waitUntil(
      (async () => {
        const workspaceUsers = await prisma.projectUsers.findFirst({
          where: {
            projectId: workspace.id,
            role: "owner",
            user: {
              email: {
                not: null,
              },
            },
          },
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        });

        if (workspaceUsers) {
          const { user } = workspaceUsers;

          await sendEmail({
            subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Discount has been deleted`,
            email: user.email!,
            react: DiscountDeleted({
              email: user.email!,
              workspace: {
                slug: workspace.slug,
              },
              coupon: {
                id: coupon.id,
              },
            }),
          });
        }
      })(),
    );

    return `Discount ${deletedDiscountId} deleted.`;
  }

  return `Failed to delete discount ${discount.id}.`;
}
