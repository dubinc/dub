import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { disableStripeDiscountCode } from "@/lib/stripe/disable-stripe-discount-code";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/discount-codes/[discountCodeId] - delete a discount code
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await prisma.discountCode.findUnique({
      where: {
        id: discountCodeId,
      },
    });

    if (!discountCode) {
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

    await prisma.discountCode.delete({
      where: {
        id: discountCodeId,
      },
    });

    waitUntil(
      disableStripeDiscountCode({
        stripeConnectId: workspace.stripeConnectId,
        code: discountCode.code,
      }),
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
