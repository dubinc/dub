import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getDiscountCodeOrThrow } from "@/lib/discount-codes/get-discount-code-or-throw";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { DiscountProvider } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/discount-codes/[discountCodeId] - update a discount code
export const PATCH = withWorkspace(
  async ({ workspace, params, session }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await getDiscountCodeOrThrow({
      discountCodeId,
      programId,
    });

    if (discountCode.discount.provider !== DiscountProvider.custom) {
      throw new DubApiError({
        code: "bad_request",
        message: `This operation is only available for "custom" discount provider.`,
      });
    }

    // TODO:
    // - Update the discount code

    return NextResponse.json({ id: discountCode.id });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

// DELETE /api/discount-codes/[discountCodeId] - soft delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await getDiscountCodeOrThrow({
      discountCodeId,
      programId,
    });

    await prisma.discountCode.update({
      where: {
        id: discountCodeId,
      },
      data: {
        discountId: null,
      },
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "discount_code.deleted",
          description: `Discount code (${discountCode.code}) deleted`,
          actor: session.user,
          targets: [
            {
              type: "discount_code",
              id: discountCode.id,
              metadata: discountCode,
            },
          ],
        }),

        deleteDiscountCodes([discountCode]),
      ]),
    );

    return NextResponse.json({ id: discountCode.id });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
