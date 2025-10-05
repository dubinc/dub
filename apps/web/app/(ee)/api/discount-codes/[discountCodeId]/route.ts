import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[discountCodeId] - soft delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await prisma.discountCode.findUnique({
      where: {
        id: discountCodeId,
      },
    });

    if (!discountCode || !discountCode.discountId) {
      throw new DubApiError({
        message: `Discount code (${discountCodeId}) not found.`,
        code: "bad_request",
      });
    }

    if (discountCode.programId !== programId) {
      throw new DubApiError({
        message: `Discount code (${discountCodeId}) is not associated with the program.`,
        code: "bad_request",
      });
    }

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

        queueDiscountCodeDeletion(discountCode.id),
      ]),
    );

    return NextResponse.json({ id: discountCode.id });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
