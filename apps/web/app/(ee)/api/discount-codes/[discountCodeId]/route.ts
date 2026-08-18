import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getDiscountCodeOrThrow } from "@/lib/discount-codes/get-discount-code-or-throw";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[discountCodeId] - delete a discount code
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
