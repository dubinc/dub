"use server";

import { prisma } from "@dub/prisma";
import { WorkspaceEnvironment } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { createId } from "../api/create-id";
import { getDiscountOrThrow } from "../api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "../api/programs/get-default-program-id-or-throw";
import { qstash } from "../cron";
import { getDiscountProvider } from "../discounts/discount-provider";
import { DubDiscountAttributes } from "../stripe/coupon-discount-converter";
import { copyDiscountToLiveSchema } from "./schemas";

export const copyDiscountToLiveAction = authActionClient
  .inputSchema(copyDiscountToLiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, targetGroupId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    if (workspace.environment !== WorkspaceEnvironment.staging) {
      throw new Error("This action is only available in staging workspaces.");
    }

    const { program: targetProgram, ...targetGroup } =
      await prisma.partnerGroup.findUniqueOrThrow({
        where: {
          id: targetGroupId,
        },
        include: {
          program: {
            select: {
              id: true,
              workspace: {
                select: {
                  id: true,
                  environment: true,
                  stripeConnectId: true,
                  shopifyStoreId: true,
                  users: {
                    where: {
                      userId: user.id,
                    },
                    select: {
                      userId: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    const { workspace: targetWorkspace } = targetProgram;

    // Check user has access in the target program
    if (targetWorkspace.users.length === 0) {
      throw new Error("You are not allowed to copy a reward to this program.");
    }

    throwIfNoPermission({
      role: targetWorkspace.users[0].role,
      requiredRoles: ["owner", "member"],
    });

    if (targetWorkspace.environment !== WorkspaceEnvironment.production) {
      throw new Error("Reward can only be copied to a live program.");
    }

    const discount = await getDiscountOrThrow({
      discountId,
      programId,
    });

    if (targetGroup.discountId) {
      throw new Error("The target group already has a discount.");
    }

    const discountProvider = getDiscountProvider(discount.provider);

    await discountProvider.assertDiscountIntegrationAvailable({
      workspace: targetWorkspace,
    });

    let newCoupon: (DubDiscountAttributes & { id: string }) | null = null;

    if (discount.provider === "stripe") {
      newCoupon = await discountProvider.createCoupon({
        workspace: targetWorkspace,
        group: targetGroup,
        data: {
          amount: discount.amount,
          type: discount.type,
          maxDuration: discount.maxDuration,
        },
      });
    }

    const newDiscount = await prisma.$transaction(async (tx) => {
      const newDiscount = await tx.discount.create({
        data: {
          id: createId({ prefix: "disc_" }),
          programId: targetGroup.programId,
          amount: discount.amount,
          type: discount.type,
          maxDuration: discount.maxDuration,
          description: discount.description,
          couponId: newCoupon?.id,
          autoProvisionEnabledAt: discount.autoProvisionEnabledAt
            ? new Date()
            : null,
          provider: discount.provider,
        },
      });

      await tx.partnerGroup.update({
        where: {
          id: targetGroupId,
        },
        data: {
          discountId: newDiscount.id,
        },
      });

      await tx.programEnrollment.updateMany({
        where: {
          groupId: targetGroupId,
        },
        data: {
          discountId: newDiscount.id,
        },
      });

      return newDiscount;
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: targetWorkspace.id,
          programId: targetProgram.id,
          action: "discount.created",
          description: `Discount ${newDiscount.id} copied from staging.`,
          actor: user,
          targets: [
            {
              type: "discount",
              id: newDiscount.id,
              metadata: newDiscount,
            },
          ],
        }),

        ...(newDiscount.autoProvisionEnabledAt
          ? [
              qstash.publishJSON({
                url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
                body: {
                  discountId: newDiscount.id,
                },
              }),
            ]
          : []),
      ]),
    );
  });
