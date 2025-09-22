import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[discountCodeId] - delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params, session }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await prisma.promoCode.findUniqueOrThrow({
      where: {
        id: discountCodeId,
      },
    });

    if (discountCode.programId !== programId) {
      throw new DubApiError({
        message: "Discount code not found.",
        code: "bad_request",
      });
    }

    // TODO:
    // Remove from the Stripe first

    await prisma.promoCode.delete({
      where: {
        id: discountCodeId,
      },
    });

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
