"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { stripeAppClient } from "@/lib/stripe";
import {
  dubDiscountToStripeCoupon,
  stripeCouponToDubDiscount,
  validateStripeCouponForDubDiscount,
} from "@/lib/stripe/coupon-discount-converter";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, truncate } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { Stripe } from "stripe";
import { authActionClient } from "../safe-action";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

export const createDiscountAction = authActionClient
  .schema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { amount, type, maxDuration, couponId, couponTestId, groupId } =
      parsedInput;

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

    if (!workspace.stripeConnectId) {
      throw new Error(
        "STRIPE_CONNECTION_REQUIRED: Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount.",
      );
    }

    let stripeCoupon: Stripe.Coupon | undefined;
    try {
      if (couponId) {
        stripeCoupon = await stripe.coupons.retrieve(couponId, {
          stripeAccount: workspace.stripeConnectId,
        });

        // Validate the Stripe coupon can be converted to a Dub discount
        const validation = validateStripeCouponForDubDiscount(stripeCoupon);
        if (!validation.isValid) {
          throw new Error(
            `Invalid Stripe coupon: ${validation.errors.join(", ")}`,
          );
        }

        // Convert Stripe coupon to Dub discount attributes
        const dubDiscountAttrs = stripeCouponToDubDiscount(stripeCoupon);
        amount = dubDiscountAttrs.amount;
        type = dubDiscountAttrs.type;
        maxDuration = dubDiscountAttrs.maxDuration;

        // if there is no couponId provided, we need to create a new coupon on Stripe
      } else {
        const stripeCouponData = dubDiscountToStripeCoupon({
          name: `Dub Discount (${truncate(group.name, 25)})`,
          amount,
          type,
          maxDuration: maxDuration ?? null,
        });

        stripeCoupon = await stripe.coupons.create(stripeCouponData, {
          stripeAccount: workspace.stripeConnectId,
        });
      }
    } catch (error) {
      throw new Error(
        error.code === "more_permissions_required_for_application"
          ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
          : error.code === "resource_missing"
            ? `The coupon ID you provided (${couponId}) was not found in your Stripe account. Please check the coupon ID and try again.`
            : error.message,
      );
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
          couponId: stripeCoupon?.id || couponId,
          ...(couponTestId && { couponTestId }),
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
