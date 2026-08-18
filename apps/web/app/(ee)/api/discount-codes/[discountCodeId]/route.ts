import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getDiscountCodeOrThrow } from "@/lib/discount-codes/get-discount-code-or-throw";
import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { sendDiscountCodeWebhook } from "@/lib/discounts/discount-code-webhook";
import { prisma } from "@/lib/prisma";
import {
  DiscountCodeSchema,
  updateDiscountCodeSchema,
} from "@/lib/zod/schemas/discount";
import { APP_DOMAIN } from "@dub/utils";
import { DiscountProvider, Prisma } from "@prisma/client";
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

// PATCH /api/discount-codes/[discountCodeId] - update a discount code
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { discountCodeId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const discountCode = await getDiscountCodeOrThrow({
      discountCodeId,
      programId,
    });

    if (discountCode.discount.provider !== DiscountProvider.custom) {
      throw new DubApiError({
        code: "bad_request",
        message: `This operation is only available for "custom" discount provider.`,
      });
    }

    const { code: newCode } = updateDiscountCodeSchema.parse(
      await parseRequestBody(req),
    );

    if (newCode !== discountCode.code) {
      const duplicateByCode = await prisma.discountCode.findUnique({
        where: {
          programId_code: {
            programId,
            code: newCode,
          },
        },
        include: {
          partner: true,
        },
      });

      if (duplicateByCode) {
        throw new DubApiError({
          code: "conflict",
          message: `This discount code "${newCode}" is already in use by [${duplicateByCode.partner.email}](${APP_DOMAIN}/${workspace.slug}/program/partners/${duplicateByCode.partner.id}). Please choose a different code.`,
        });
      }
    }

    let updatedDiscountCode: Prisma.DiscountCodeGetPayload<{
      include: { discount: true };
    }>;

    try {
      updatedDiscountCode = await prisma.discountCode.update({
        where: {
          id: discountCodeId,
        },
        data: {
          code: newCode,
        },
        include: {
          discount: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicateByCode = await prisma.discountCode.findUnique({
          where: {
            programId_code: {
              programId,
              code: newCode,
            },
          },
          include: {
            partner: {
              select: {
                email: true,
                id: true,
              },
            },
          },
        });

        throw new DubApiError({
          code: "conflict",
          message: duplicateByCode
            ? `This discount code "${newCode}" is already in use by [${duplicateByCode.partner.email}](${APP_DOMAIN}/${workspace.slug}/program/partners/${duplicateByCode.partner.id}). Please choose a different code.`
            : `This discount code "${newCode}" is already in use. Please choose a different code.`,
        });
      }

      throw error;
    }

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "discount_code.updated",
          description: `Discount code (${updatedDiscountCode.code}) updated`,
          actor: session.user,
          targets: [
            {
              type: "discount_code",
              id: updatedDiscountCode.id,
              metadata: updatedDiscountCode,
            },
          ],
        }),

        sendDiscountCodeWebhook({
          trigger: "discount_code.updated",
          workspaceId: workspace.id,
          programId,
          data: updatedDiscountCode,
        }),
      ]),
    );

    return NextResponse.json(DiscountCodeSchema.parse(updatedDiscountCode));
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
