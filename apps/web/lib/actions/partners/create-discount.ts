"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { DubDiscountAttributes } from "@/lib/stripe/coupon-discount-converter";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { DiscountProvider } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const createDiscountAction = authActionClient
  .inputSchema(createDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      provider,
      amount,
      type,
      maxDuration,
      couponId,
      couponTestId,
      groupId,
      autoProvision,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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

    const discountProvider = getDiscountProvider(provider);

    let coupon: (DubDiscountAttributes & { id: string }) | null = null;

    // Fetch existing coupon if couponId is provided otherwise create a new coupon on the discount provider
    if (provider === DiscountProvider.stripe) {
      if (couponId) {
        coupon = await discountProvider.getCoupon({
          couponId,
          workspace,
        });
      } else {
        coupon = await discountProvider.createCoupon({
          workspace,
          group,
          data: parsedInput,
        });
      }
    } else if (provider === DiscountProvider.shopify) {
      await discountProvider.assertDiscountIntegrationAvailable({
        workspace,
      });
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
          provider,
          couponId: coupon?.id || couponId || null,
          ...(couponTestId && { couponTestId }),
          ...(autoProvision && { autoProvisionEnabledAt: new Date() }),
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

      await tx.discountCode.updateMany({
        where: {
          programEnrollment: {
            groupId,
          },
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

        ...(discount.autoProvisionEnabledAt
          ? [
              qstash.publishJSON({
                url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
                body: {
                  discountId: discount.id,
                },
              }),
            ]
          : []),
      ]),
    );
  });
