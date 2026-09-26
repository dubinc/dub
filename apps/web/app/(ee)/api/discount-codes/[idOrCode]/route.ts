import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDiscountCode } from "@/lib/api/partners/get-discount-code";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { softDeleteDiscountCodes } from "@/lib/discounts/soft-delete-discount-codes";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[idOrCode] - delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { idOrCode } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await getDiscountCode({
      where: idOrCode.startsWith("dcode_")
        ? { id: idOrCode, programId }
        : { programId, code: idOrCode },
      include: {
        discount: true,
      },
    });

    if (!discountCode) {
      throw new DubApiError({
        code: "not_found",
        message: `Discount code (${idOrCode}) not found.`,
      });
    }

    await softDeleteDiscountCodes({
      where: {
        id: discountCode.id,
      },
    });

    waitUntil(
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
            metadata: {
              ...discountCode,
              linkId: discountCode.linkId ?? "",
            },
          },
        ],
      }),
    );

    return NextResponse.json({ id: discountCode.id });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
