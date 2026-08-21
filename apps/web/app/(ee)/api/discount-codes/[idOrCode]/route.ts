import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[idOrCode] - delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { idOrCode } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await prisma.discountCode.findUnique({
      where: idOrCode.startsWith("dcode_")
        ? { id: idOrCode }
        : { programId_code: { programId, code: idOrCode } },
      include: {
        discount: true,
      },
    });

    if (!discountCode || !discountCode.discount) {
      throw new DubApiError({
        code: "not_found",
        message: `Discount code (${idOrCode}) not found.`,
      });
    }

    if (discountCode.programId !== programId) {
      throw new DubApiError({
        code: "not_found",
        message: `Discount code (${idOrCode}) not found.`,
      });
    }

    await prisma.discountCode.update({
      where: {
        id: discountCode.id,
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
