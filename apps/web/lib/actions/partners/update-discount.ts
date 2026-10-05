"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { revalidateProgramPublicPages } from "@/lib/api/programs/revalidate-program-public-pages";
import { invalidateLinksForDiscountsJob } from "@/lib/jobs/handlers/invalidate-links-for-discounts-job";
import { publishDiscountCodesCreationJob } from "@/lib/jobs/handlers/publish-discount-codes-creation-job";
import { prisma } from "@/lib/prisma";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const updateDiscountAction = authActionClient
  .inputSchema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId, couponTestId, autoProvision } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const updatedDiscount = await prisma.discount.update({
      where: {
        id: discountId,
      },
      data: {
        couponTestId: couponTestId || null,
        ...(autoProvision !== undefined && {
          autoProvisionEnabledAt: autoProvision
            ? discount.autoProvisionEnabledAt ?? new Date()
            : null,
        }),
      },
    });

    const shouldExpireCache =
      discount.couponTestId !== updatedDiscount.couponTestId;

    if (shouldExpireCache) {
      revalidateProgramPublicPages(programId);
    }

    await Promise.all([
      ...(shouldExpireCache
        ? [
            invalidateLinksForDiscountsJob.dispatch(
              {
                by: "discount",
                programId,
                discountId: discount.id,
              },
              { label: discount.id },
            ),
          ]
        : []),

      ...(updatedDiscount.autoProvisionEnabledAt
        ? [
            publishDiscountCodesCreationJob.dispatch(
              { discountId: discount.id },
              { label: discount.id },
            ),
          ]
        : []),
    ]);

    waitUntil(
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
    );
  });
