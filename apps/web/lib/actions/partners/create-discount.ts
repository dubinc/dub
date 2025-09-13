"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { createStripeCoupon } from "@/lib/stripe/create-stripe-coupon";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createDiscountAction = authActionClient
  .schema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let {
      amount,
      type,
      maxDuration,
      couponId,
      couponTestId,
      groupId,
      enableCouponTracking,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      groupId,
      programId,
    });

    if (group.discountId) {
      throw new Error(
        `You can't create a discount for this group because it already has a discount.`,
      );
    }

    // If no couponId or couponTestId is provided, create a new coupon on Stripe
    const shouldCreateCouponOnStripe = !couponId && !couponTestId;

    if (shouldCreateCouponOnStripe) {
      if (!workspace.stripeConnectId) {
        throw new Error(
          "You need to install Dub Stripe app before creating a coupon.",
        );
      }

      const stripeCoupon = await createStripeCoupon({
        workspace: {
          id: workspace.id,
          stripeConnectId: workspace.stripeConnectId,
        },
        discount: {
          amount,
          type,
          maxDuration: maxDuration ?? null,
        },
      });

      if (!stripeCoupon) {
        throw new Error(
          "Failed to create Stripe coupon. Make sure you installed the latest version of the Dub Stripe app.",
        );
      }

      couponId = stripeCoupon.id;
    }

    // Create the discount and update the group and program enrollment
    const discount = await prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
        data: {
          id: createId({ prefix: "disc_" }),
          programId,
          amount,
          type,
          maxDuration,
          couponId,
          ...(couponTestId && { couponTestId }),
          ...(enableCouponTracking && {
            couponCodeTrackingEnabledAt: new Date(),
          }),
        },
      });

      await tx.partnerGroup.update({
        where: {
          id: groupId,
        },
        data: {
          discountId: discount.id,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          groupId,
        },
        data: {
          discountId: discount.id,
        },
      });

      return discount;
    });

    waitUntil(
      Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
          body: {
            groupId,
          },
        }),

        discount.couponCodeTrackingEnabledAt &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/enqueue-coupon-code-create-jobs`,
            body: {
              discountId: discount.id,
            },
          }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "discount.created",
          description: `Discount ${discount.id} created`,
          actor: user,
          targets: [
            {
              type: "discount",
              id: discount.id,
              metadata: discount,
            },
          ],
        }),
      ]),
    );
  });
