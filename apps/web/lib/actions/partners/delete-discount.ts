"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { getPartnerIdsUsingDiscount } from "@/lib/discounts/get-partner-ids-using-discount";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .inputSchema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    // Cache discount codes to delete them later
    const discountCodes = await prisma.discountCode.findMany({
      where: {
        discountId: discount.id,
      },
      include: {
        discount: true,
      },
    });

    const partnerIds = await getPartnerIdsUsingDiscount({
      discountIds: [discount.id],
    });

    await prisma.$transaction(async (tx) => {
      await tx.partnerGroup.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
      });

      // Restore enrollments to the group level discount, or clear them if none
      const partnerGroup = discount.groupId
        ? await tx.partnerGroup.findUnique({
            where: {
              id: discount.groupId,
            },
            select: {
              discountId: true,
            },
          })
        : null;

      await tx.programEnrollment.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: partnerGroup?.discountId ?? null,
        },
      });

      await tx.linkReward.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: null,
        },
      });

      await tx.discount.delete({
        where: {
          id: discount.id,
        },
      });
    });

    waitUntil(
      Promise.allSettled([
        ...(partnerIds.length > 0
          ? [
              invalidateLinksForDiscountsJob.dispatch(
                {
                  type: "partners",
                  partnerIds,
                  programId,
                },
                {
                  label: discountId,
                },
              ),
            ]
          : []),

        deleteDiscountCodes(discountCodes),

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
      ]),
    );
  });
