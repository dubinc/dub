import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { WebhookHandlerInput, WebhookHandlerResponse } from "./types";

// Handle event "coupon.deleted"
export async function couponDeleted({
  event,
  workspace,
}: Omit<
  WebhookHandlerInput<Stripe.CouponDeletedEvent>,
  "mode"
>): Promise<WebhookHandlerResponse> {
  const coupon = event.data.object;
  const stripeAccountId = event.account as string;

  if (!workspace.defaultProgramId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`,
    };
  }

  const discounts = await prisma.discount.findMany({
    where: {
      programId: workspace.defaultProgramId,
      OR: [{ couponId: coupon.id }, { couponTestId: coupon.id }],
    },
  });

  if (!discounts.length) {
    return {
      response: `Discount not found for Stripe coupon ${coupon.id}.`,
    };
  }

  const discountIds = discounts.map((d) => d.id);

  await prisma.$transaction(async (tx) => {
    if (discountIds.length > 0) {
      await tx.partnerGroup.updateMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
        data: {
          discountId: null,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
        data: {
          discountId: null,
        },
      });

      await tx.discountCode.deleteMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
      });

      await tx.discount.deleteMany({
        where: {
          id: {
            in: discountIds,
          },
        },
      });
    }
  });

  waitUntil(
    (async () => {
      const { users } = await getWorkspaceUsers({
        workspaceId: workspace.id,
        role: "owner",
      });

      await Promise.allSettled([
        invalidateLinksForDiscountsJob.dispatchBatch(
          discountIds.map((discountId) => ({
            discountId,
          })),
          ({ discountId }) => ({
            label: discountId,
          }),
        ),

        sendBatchEmail(
          users.map((user) => ({
            from: VARIANT_TO_FROM_MAP.notifications,
            to: user.email,
            subject: "Your discount has been deleted",
            react: DiscountDeleted({
              email: user.email,
              coupon: {
                id: coupon.id,
              },
            }),
          })),
        ),
      ]);
    })(),
  );

  return {
    response: `Stripe coupon ${coupon.id} deleted.`,
  };
}
