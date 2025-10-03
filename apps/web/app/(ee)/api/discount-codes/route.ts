import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
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
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/discount-codes - get all discount codes for a partner
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId } = getDiscountCodesQuerySchema.parse(searchParams);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includeDiscountCodes: true,
    });

    const response = DiscountCodeSchema.array().parse(
      programEnrollment.discountCodes,
    );

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

    const { partnerId, linkId, code } = createDiscountCodeSchema.parse(
      await parseRequestBody(req),
    );

    if (!workspace.stripeConnectId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount codes.",
      });
    }

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includeDiscount: true,
      includeDiscountCodes: true,
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

    // Check for duplicate by code
    if (code) {
      const duplicateByCode = await prisma.discountCode.findUnique({
        where: {
          programId_code: {
            programId,
            code,
          },
        },
      });

      if (duplicateByCode) {
        throw new DubApiError({
          code: "bad_request",
          message: `A discount with the code ${code} already exists in the program. Please choose a different code.`,
        });
      }
    }

    // A link can have only one discount code
    const duplicateByLink = programEnrollment.discountCodes.find(
      (discountCode) => discountCode.linkId === linkId,
    );

    if (duplicateByLink) {
      throw new DubApiError({
        code: "bad_request",
        message: `This link already has a discount code (${duplicateByLink.code}) assigned.`,
      });
    }

    // Use the link.key as the code if no code is provided
    const finalCode = code || link.key;

    try {
      const stripeDiscountCode = await createStripeDiscountCode({
        stripeConnectId: workspace.stripeConnectId,
        discount,
        code: finalCode,
        shouldRetry: !code,
      });

      if (!stripeDiscountCode?.code) {
        throw new DubApiError({
          code: "bad_request",
          message: "Failed to create Stripe discount code. Please try again.",
        });
      }

      const discountCode = await prisma.discountCode.create({
        data: {
          id: createId({ prefix: "dcode_" }),
          code: stripeDiscountCode.code,
          programId,
          partnerId,
          linkId,
          discountId: discount.id,
        },
      });

      waitUntil(
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "discount_code.created",
          description: `Discount code (${discountCode.code}) created`,
          actor: session.user,
          targets: [
            {
              type: "discount_code",
              id: discountCode.id,
              metadata: discountCode,
            },
          ],
        }),
      );

      return NextResponse.json(DiscountCodeSchema.parse(discountCode));
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message:
          error.code === "more_permissions_required_for_application"
            ? "STRIPE_APP_UPGRADE_REQUIRED: Your connected Stripe account doesn't have the permissions needed to create discount codes. Please upgrade your Stripe integration in settings or reach out to our support team for help."
            : error.message,
      });
    }
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
