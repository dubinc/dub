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
      ? discount.couponCodeTrackingEnabledAt ?? new Date()
      : null;

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

    const { couponTestIdChanged, trackingDisabled } = detectDiscountChanges(
      discount,
      updatedDiscount,
    );

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

        trackingDisabled &&
          partnerGroup &&
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/enqueue-coupon-code-delete-jobs`,
            body: {
              groupId: partnerGroup.id,
            },
          }),

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

  const trackingEnabled =
    prev.couponCodeTrackingEnabledAt === null &&
    next.couponCodeTrackingEnabledAt !== null;

  const trackingDisabled =
    prev.couponCodeTrackingEnabledAt !== null &&
    next.couponCodeTrackingEnabledAt === null;

  return {
    couponTestIdChanged,
    trackingEnabled,
    trackingDisabled,
  };
}

async function queueDiscountCodeDeletionJobs(discountId: string) {
  const queue = qstash.queue({
    queueName: "discount-code-deletion",
  });

  await queue.upsert({
    parallelism: 10,
  });

  // take 100 and do pagination
  
  const pageSize = 100
  let hasMore = true
  let cursor = null

  while (hasMore) {
    const discountCode = await prisma.discountCode.findMany({
      where: {
        discountId,
      },
      select: {
        id: true,
      },
      take: pageSize,
      orderBy: {
        createdAt: "asc",
      },
      ...(cursor ? {
        cursor: {
          id: cursor,
        },
      }),
    });
  }




  // const response = await queue.enqueueJSON({
  //   url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
  //   method: "POST",
  //   body: {
  //     discountCodeId = 
  //   },
  // });
}
