"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { attachDiscountJob } from "@/lib/jobs/handlers/attach-discount-job";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_LEVEL_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { DubDiscountAttributes } from "@/lib/stripe/coupon-discount-converter";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { DiscountProvider } from "@prisma/client";
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
      isDefault,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    if (
      !isDefault &&
      !getPlanCapabilities(workspace.plan).canUseAdvancedRewardLogic
    ) {
      throw new Error(PARTNER_LEVEL_REWARDS_PLAN_ERROR);
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      groupId,
      programId,
    });

    if (isDefault && group.discountId) {
      throw new Error("This group already has a default discount.");
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
      await discountProvider.assertDiscountIntegration({
        workspace,
      });
    }

    // Create the discount and assign it to the group when it is the default
    const discount = await prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
        data: {
          id: createId({ prefix: "disc_" }),
          programId,
          groupId,
          amount,
          type,
          maxDuration,
          provider,
          couponId:
            provider === DiscountProvider.stripe
              ? coupon?.id || couponId || null
              : null,
          ...(provider === DiscountProvider.stripe &&
            couponTestId && { couponTestId }),
          ...(autoProvision && { autoProvisionEnabledAt: new Date() }),
        },
      });

      if (isDefault) {
        const { count } = await tx.partnerGroup.updateMany({
          where: {
            id: groupId,
            discountId: null,
          },
          data: {
            discountId: discount.id,
          },
        });

        // This means that the group already has a default discount
        if (count === 0) {
          throw new Error("This group already has a default discount.");
        }
      }

      return discount;
    });

    // No need to attach the discount to the group if it is not the default
    // because the default discount is attached to the group when the discount is created
    if (isDefault) {
      await attachDiscountJob.dispatch(
        { discountId: discount.id },
        { label: discount.id },
      );
    }

    waitUntil(
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
    );

    return {
      id: discount.id,
    };
  });
