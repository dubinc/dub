"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { qstash } from "@/lib/cron";
import { createStripeCoupon } from "@/lib/stripe/create-coupon";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import Stripe from "stripe";
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
      isDefault,
      includedPartnerIds,
      excludedPartnerIds,
      provider,
    } = parsedInput;

    includedPartnerIds = includedPartnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    // A program can have only one default discount
    if (isDefault) {
      const defaultDiscount = await prisma.discount.findFirst({
        where: {
          programId,
          default: true,
        },
      });

      if (defaultDiscount) {
        throw new Error(
          "There is an existing default discount already. A program can only have one default discount.",
        );
      }
    }

    const finalPartnerIds = [...includedPartnerIds, ...excludedPartnerIds];

    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: finalPartnerIds,
          },
        },
        select: {
          partnerId: true,
          discountId: true,
          partner: true,
        },
      });

      const invalidPartnerIds = finalPartnerIds.filter(
        (id) =>
          !programEnrollments.some((enrollment) => enrollment.partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    // Create Stripe coupon for link-based coupon codes
    let stripeCoupon: Stripe.Coupon | null = null;

    if (provider === "stripe") {
      if (!workspace.stripeConnectId) {
        throw new Error(
          "Make sure you have connected your Stripe account to your workspace to create a coupon.",
        );
      }

      const response = await createStripeCoupon({
        coupon: {
          amount,
          type,
          maxDuration: maxDuration ?? null,
        },
        stripeConnectId: workspace.stripeConnectId,
      });

      if (!response) {
        throw new Error("Failed to create a coupon on Stripe.");
      }

      stripeCoupon = response;
    }

    const discount = await prisma.discount.create({
      data: {
        id: createId({ prefix: "disc_" }),
        programId,
        amount,
        type,
        maxDuration,
        couponId: stripeCoupon?.id ?? couponId,
        couponTestId,
        default: isDefault,
        provider,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        ...(discount.default
          ? {
              discountId: null,
              ...(excludedPartnerIds.length > 0 && {
                partnerId: {
                  notIn: excludedPartnerIds,
                },
              }),
            }
          : {
              partnerId: {
                in: includedPartnerIds,
              },
            }),
      },
      data: {
        discountId: discount.id,
      },
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              discountId: discount.id,
              action: "discount-created",
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
        ]);
      })(),
    );
  });
