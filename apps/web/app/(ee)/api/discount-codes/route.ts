import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createStripeDiscountCode } from "@/lib/stripe/create-stripe-discount-code";
import {
  createDiscountCodeSchema,
  DiscountCodeSchema,
  getDiscountCodesQuerySchema,
} from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/discount-codes - get all discount codes for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId } = getDiscountCodesQuerySchema.parse(searchParams);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    const discountCodes = await prisma.discountCode.findMany({
      where: {
        programId,
        partnerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const response = DiscountCodeSchema.array().parse(discountCodes);

    return NextResponse.json(response);
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

// POST /api/discount-codes - create a discount code
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { partnerId, linkId, code } = createDiscountCodeSchema.parse(
      await parseRequestBody(req),
    );

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includeDiscount: true,
    });

    const link = programEnrollment.links.find((link) => link.id === linkId);

    if (!link) {
      throw new DubApiError({
        code: "bad_request",
        message: "Partner link not found.",
      });
    }

    const { discount } = programEnrollment;

    if (!discount) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "No discount is assigned to this partner group. Please add a discount before proceeding.",
      });
    }

    if (!discount.couponCodeTrackingEnabledAt) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Coupon code tracking is not enabled for this discount. Please enable it before creating a discount code.",
      });
    }

    code = code || link.key;

    const existingDiscountCode = await prisma.discountCode.findUnique({
      where: {
        programId_code: {
          programId,
          code,
        },
      },
    });

    if (existingDiscountCode) {
      throw new DubApiError({
        code: "bad_request",
        message: `A discount with the code ${code} already exists. Please choose a different code.`,
      });
    }

    // Create discount code on Stripe
    const stripeDiscountCode = await createStripeDiscountCode({
      workspace: {
        id: workspace.id,
        stripeConnectId: workspace.stripeConnectId,
      },
      discount: {
        id: discount.id,
        couponId: discount.couponId,
      },
      code,
    });

    if (!stripeDiscountCode) {
      throw new DubApiError({
        code: "bad_request",
        message: "Failed to create discount code on Stripe.",
      });
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        code,
        programId,
        partnerId,
        linkId,
        discountId: discount.id,
      },
    });

    const response = DiscountCodeSchema.parse(discountCode);

    return NextResponse.json(response);
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
