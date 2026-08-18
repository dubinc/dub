import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createDiscountCode } from "@/lib/discounts/create-discount-code";
import { prisma } from "@/lib/prisma";
import {
  createDiscountCodeSchema,
  DiscountCodeSchema,
  getDiscountCodesQuerySchema,
} from "@/lib/zod/schemas/discount";
import { APP_DOMAIN } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/discount-codes - list discount codes
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      partnerId,
      discountId,
      page = 1,
      pageSize,
    } = getDiscountCodesQuerySchema.parse(searchParams);

    if (discountId) {
      await getDiscountOrThrow({
        discountId,
        programId,
      });
    }

    if (partnerId) {
      await getProgramEnrollmentOrThrow({
        partnerId,
        programId,
        include: {},
      });
    }

    const discountCodes = await prisma.discountCode.findMany({
      where: {
        programId,
        ...(partnerId && { partnerId }),
        ...(discountId && { discountId }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return NextResponse.json(DiscountCodeSchema.array().parse(discountCodes));
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
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
        discount: true,
        links: {
          select: {
            id: true,
          },
        },
        discountCodes: {
          select: {
            code: true,
            linkId: true,
          },
        },
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

    // Check for duplicate by code
    if (code) {
      const duplicateByCode = await prisma.discountCode.findUnique({
        where: {
          programId_code: {
            programId: discount.programId,
            code,
          },
        },
        include: {
          partner: true,
        },
      });

      if (duplicateByCode) {
        throw new DubApiError({
          code: "conflict",
          message: `This discount code "${code}" is already in use by [${duplicateByCode.partner.email}](${APP_DOMAIN}/${workspace.slug}/program/partners/${duplicateByCode.partner.id}). Please choose a different code.`,
        });
      }
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
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
