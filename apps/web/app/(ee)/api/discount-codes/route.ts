import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createDiscountCode } from "@/lib/discounts/create-discount-code";
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
      include: {
        discountCodes: true,
      },
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

    const discountCode = await createDiscountCode({
      workspace,
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
