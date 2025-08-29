"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { DiscountProps } from "@/lib/types";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, enableCouponTracking, couponTestId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const couponCodeTrackingEnabledAt = enableCouponTracking
      ? discount.couponCodeTrackingEnabledAt ?? new Date() // enable once
      : discount.couponCodeTrackingEnabledAt
        ? null // disable
        : null; // already disabled, keep null

    const { partnerGroup, ...updatedDiscount } = await prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        couponTestId: couponTestId || null,
        couponCodeTrackingEnabledAt,
      },
      include: {
        partnerGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    const {
      couponTestIdChanged,
      trackingStatusChanged,
      trackingEnabled,
      promotionCodesDisabled,
    } = detectDiscountChanges(discount, updatedDiscount);

    waitUntil(
      Promise.allSettled([
        couponTestIdChanged &&
          partnerGroup &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId: partnerGroup.id,
            },
          }),

        trackingEnabled &&
          partnerGroup &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-promotion-codes`,
            body: {
              discountId: discount.id,
            },
          }),

        promotionCodesDisabled &&
          partnerGroup &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete-promotion-codes`,
            body: {
              groupId: partnerGroup.id,
            },
          }),

        (couponTestIdChanged || trackingStatusChanged) &&
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

function detectDiscountChanges(
  prev: Pick<DiscountProps, "couponTestId" | "couponCodeTrackingEnabledAt">,
  next: Pick<DiscountProps, "couponTestId" | "couponCodeTrackingEnabledAt">,
) {
  const couponTestIdChanged = prev.couponTestId !== next.couponTestId;

  const trackingStatusChanged =
    prev.couponCodeTrackingEnabledAt?.getTime() !==
    next.couponCodeTrackingEnabledAt?.getTime();

  const trackingEnabled =
    prev.couponCodeTrackingEnabledAt === null &&
    next.couponCodeTrackingEnabledAt !== null;

  const promotionCodesDisabled =
    prev.couponCodeTrackingEnabledAt !== null &&
    next.couponCodeTrackingEnabledAt === null;

  return {
    couponTestIdChanged,
    trackingStatusChanged,
    trackingEnabled,
    promotionCodesDisabled,
  };
}
