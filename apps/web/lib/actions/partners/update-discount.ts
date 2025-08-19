"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { discountId, enableCouponTracking, couponTestId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const { partnerGroup, ...updatedDiscount } = await prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        couponTestId: couponTestId || null,
        couponCodeTrackingEnabledAt: enableCouponTracking ? new Date() : null,
      },
      include: {
        partnerGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    const couponTestIdChanged =
      discount.couponTestId !== updatedDiscount.couponTestId;
    const trackingEnabledChanged =
      discount.couponCodeTrackingEnabledAt !==
      updatedDiscount.couponCodeTrackingEnabledAt;

    const shouldCreatePromotionCodes =
      discount.couponCodeTrackingEnabledAt === null &&
      updatedDiscount.couponCodeTrackingEnabledAt !== null;

    const shouldDeletePromotionCodes =
      discount.couponCodeTrackingEnabledAt !== null &&
      updatedDiscount.couponCodeTrackingEnabledAt === null;

    waitUntil(
      Promise.allSettled([
        couponTestIdChanged &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId: partnerGroup?.id,
            },
          }),

        shouldCreatePromotionCodes &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-promotion-codes`,
            body: {
              groupId: partnerGroup?.id,
            },
          }),

        shouldDeletePromotionCodes &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete-promotion-codes`,
            body: {
              groupId: partnerGroup?.id,
            },
          }),

        (couponTestIdChanged || trackingEnabledChanged) &&
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.updated",
            description: `Discount ${discount.id} updated`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discount.id,
                metadata: updatedDiscount,
              },
            ],
          }),
      ]),
    );
  });
