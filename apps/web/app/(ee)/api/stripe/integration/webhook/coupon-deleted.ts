import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getPartnerIdsUsingDiscount } from "@/lib/discounts/get-partner-ids-using-discount";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { pluck } from "@dub/utils";
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

  const programId = workspace.defaultProgramId;

  if (!programId) {
    return {
      response: `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`,
    };
  }

  const discounts = await prisma.discount.findMany({
    where: {
      programId,
      OR: [{ couponId: coupon.id }, { couponTestId: coupon.id }],
    },
  });

  if (!discounts.length) {
    return {
      response: `Discount not found for Stripe coupon ${coupon.id}.`,
    };
  }

  const discountIds = pluck(discounts, "id");
  const groupIds = pluck(discounts, "groupId").filter(Boolean) as string[];
  const partnerIds = await getPartnerIdsUsingDiscount({ discountIds });

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

      const partnerGroups = await tx.partnerGroup.findMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        select: {
          id: true,
          discountId: true,
        },
      });

      const partnerGroupById = new Map(
        partnerGroups.map((partnerGroup) => [partnerGroup.id, partnerGroup]),
      );

      // Restore enrollments to the group level discount, or clear them if none
      for (const discount of discounts) {
        const nextDiscountId = discount.groupId
          ? partnerGroupById.get(discount.groupId)?.discountId ?? null
          : null;

        await tx.programEnrollment.updateMany({
          where: {
            discountId: discount.id,
          },
          data: {
            discountId: nextDiscountId,
          },
        });
      }

      await tx.discountCode.deleteMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
      });

      await tx.linkReward.updateMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
        data: {
          discountId: null,
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
        ...(partnerIds.length > 0
          ? [
              invalidateLinksForDiscountsJob.dispatch(
                {
                  type: "partners",
                  partnerIds,
                  programId,
                },
                {
                  label: coupon.id,
                },
              ),
            ]
          : []),

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
