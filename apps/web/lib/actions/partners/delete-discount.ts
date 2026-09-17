"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { deleteDiscountJob } from "@/lib/jobs/handlers/delete-discount-job";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
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

    const [enrollments, partnerGroup] = await Promise.all([
      prisma.programEnrollment.findMany({
        where: {
          discountId: discount.id,
        },
        select: {
          partnerId: true,
        },
      }),

      discount.groupId
        ? prisma.partnerGroup.findUnique({
            where: {
              id: discount.groupId,
            },
            select: {
              discountId: true,
            },
          })
        : null,
    ]);

    const partnerIds = pluck(enrollments, "partnerId");

    // If the partner group has a discountId and it is not the same as the discount being deleted,
    // restore to that discountId; otherwise, set to null
    const restoredDiscountId =
      partnerGroup?.discountId !== discount.id
        ? partnerGroup?.discountId
        : null;

    const discountCodes =
      restoredDiscountId == null
        ? await prisma.discountCode.findMany({
            where: {
              discountId: discount.id,
            },
            include: {
              discount: true,
            },
          })
        : null;

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
      await tx.programEnrollment.updateMany({
        where: {
          discountId: discount.id,
        },
        data: {
          discountId: restoredDiscountId,
        },
      });

      if (restoredDiscountId == null) {
        await tx.discount.delete({
          where: {
            id: discount.id,
          },
        });
      }
    });

    if (restoredDiscountId != null) {
      await deleteDiscountJob.dispatch(
        {
          programId,
          discountId: discount.id,
          partnerIds,
        },
        {
          label: discount.id,
          flowControl: {
            key: `delete-discount-${discount.id}`,
            parallelism: 1,
          },
        },
      );
    }

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

        ...(discountCodes != null ? [deleteDiscountCodes(discountCodes)] : []),

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
