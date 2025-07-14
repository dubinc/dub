"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { deleteStripeCoupon } from "@/lib/stripe/delete-coupon";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .schema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    if (!discount.default) {
      let offset = 0;

      while (true) {
        const partners = await prisma.programEnrollment.findMany({
          where: {
            programId,
            discountId,
          },
          select: {
            partnerId: true,
          },
          skip: offset,
          take: 1000,
        });

        if (partners.length === 0) {
          break;
        }

        await redis.lpush(
          `discount-partners:${discountId}`,
          partners.map((partner) => partner.partnerId),
        );

        offset += 1000;
      }
    }

    const deletedDiscountId = await prisma.$transaction(async (tx) => {
      // 1. Find the default discount (if it exists)
      const defaultDiscount = await tx.discount.findFirst({
        where: {
          programId,
          default: true,
        },
      });

      // 2. Update current associations
      await tx.programEnrollment.updateMany({
        where: {
          programId,
          discountId: discount.id,
        },
        data: {
          // Replace the current discount with the default discount if it exists
          // and the discount we're deleting is not the default discount
          discountId: discount.default
            ? null
            : defaultDiscount
              ? defaultDiscount.id
              : null,
        },
      });

      // 3. Finally, delete the current discount
      await tx.discount.delete({
        where: {
          id: discount.id,
        },
      });

      return discountId;
    });

    if (deletedDiscountId) {
      waitUntil(
        Promise.allSettled([
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              programId,
              discountId,
              isDefault: discount.default,
              action: "discount-deleted",
            },
          }),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.deleted",
            description: `Discount ${discountId} deleted`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discountId,
                metadata: discount,
              },
            ],
          }),

          // Remove the Stripe coupon if it exists
          discount.couponId &&
            deleteStripeCoupon({
              couponId: discount.couponId,
              stripeConnectId: workspace.stripeConnectId,
            }),
        ]),
      );
    }
  });
