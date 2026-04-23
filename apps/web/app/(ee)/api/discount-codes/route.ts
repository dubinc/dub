import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createDiscountCode } from "@/lib/api/discounts/create-discount-code";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import {
  createDiscountCodeSchema,
  DiscountCodeSchema,
  getDiscountCodesQuerySchema,
} from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/discount-codes - get all discount codes for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { partnerId, tenantId, discountId, linkId } =
      getDiscountCodesQuerySchema.parse(searchParams);

    const [programEnrollment, discount, link] = await Promise.all([
      partnerId || tenantId
        ? prisma.programEnrollment.findUnique({
            where: partnerId
              ? { partnerId_programId: { partnerId, programId } }
              : { tenantId_programId: { tenantId: tenantId!, programId } },
            select: {
              partnerId: true,
            },
          })
        : null,

      discountId
        ? prisma.discount.findUnique({
            where: {
              id: discountId,
              programId,
            },
            select: {
              programId: true,
            },
          })
        : null,

      linkId
        ? prisma.link.findUnique({
            where: {
              id: linkId,
            },
            select: {
              programId: true,
            },
          })
        : null,
    ]);

    // Filter by partner or tenant
    if ((partnerId || tenantId) && !programEnrollment) {
      throw new DubApiError({
        code: "not_found",
        message: `The partner with ${partnerId ? "partnerId" : "tenantId"} ${partnerId ?? tenantId} is not enrolled in your program.`,
      });
    }

    if (programEnrollment) {
      partnerId = programEnrollment.partnerId;
    }

    // Filter by discount
    if (discountId && (!discount || discount.programId !== programId)) {
      throw new DubApiError({
        code: "not_found",
        message: "Discount not found.",
      });
    }

    // Filter by link
    if (linkId && (!link || link.programId !== programId)) {
      throw new DubApiError({
        code: "not_found",
        message: "Link not found.",
      });
    }

    const discountCodes = await prisma.discountCode.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
        ...(linkId && { linkId }),
        ...(discountId && { discountId }),
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

    const { partnerId, linkId, code } = createDiscountCodeSchema.parse(
      await parseRequestBody(req),
    );

    if (!workspace.stripeConnectId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Your workspace isn't connected to Stripe yet. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
      });
    }

    const installedStripeIntegration =
      await prisma.installedIntegration.findFirst({
        where: {
          projectId: workspace.id,
          integrationId: STRIPE_INTEGRATION_ID,
        },
        select: {
          settings: true,
        },
      });

    if (!installedStripeIntegration) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The Stripe integration is not installed on your workspace. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
      });
    }

    const stripeIntegrationSettings = stripeIntegrationSettingsSchema.parse(
      installedStripeIntegration.settings || {},
    );

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        links: true,
        discount: true,
        discountCodes: true,
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const { links, discount } = programEnrollment;

    const link = links.find((link) => link.id === linkId);

    if (!link) {
      throw new DubApiError({
        code: "bad_request",
        message: "Partner link not found.",
      });
    }

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

    try {
      const discountCode = await createDiscountCode({
        stripeConnectId: workspace.stripeConnectId,
        stripeMode: stripeIntegrationSettings.stripeMode,
        partner: programEnrollment.partner,
        link,
        discount,
        code,
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
    requiredRoles: ["owner", "member"],
  },
);
