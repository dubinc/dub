import { createManualCommissions } from "@/lib/api/commissions/create-manual-commissions";
import { getCommissions } from "@/lib/api/commissions/get-commissions";
import { transformCustomerForCommission } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CommissionEnrichedSchema,
  createCommissionResponseSchema,
  createManualCommissionBodySchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/commissions - get all commissions for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  let { partnerId, tenantId, ...filters } = getCommissionsQuerySchema
    .extend({
      fraudEventGroupId: z.string().optional(),
      type: z.string().optional(), // May be comma-separated string, for multi-value handling
    })
    .parse(searchParams);

  if (tenantId && !partnerId) {
    const partner = await prisma.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId,
          programId,
        },
      },
      select: {
        partnerId: true,
      },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: `Partner with specified tenantId ${tenantId} not found.`,
      });
    }

    partnerId = partner.partnerId;
  }

  const commissions = await getCommissions({
    ...filters,
    partnerId,
    programId,
  });

  return NextResponse.json(
    z.array(CommissionEnrichedSchema).parse(
      commissions.map((c) => ({
        ...c,
        customer: transformCustomerForCommission(c.customer),
        partner: {
          ...c.partner,
          groupId: c.programEnrollment.groupId,
        },
      })),
    ),
  );
});

// POST /api/commissions - create manual commission
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const body = createManualCommissionBodySchema.parse(
      await parseRequestBody(req),
    );

    console.time("createManualCommissions");

    await createManualCommissions({
      ...body,
      workspace,
      programId,
      user: session.user,
    });

    console.timeEnd("createManualCommissions");

    return NextResponse.json(
      createCommissionResponseSchema.parse({
        success: true,
        message: "Your commissions are being created and will appear shortly.",
      }),
      {
        status: 202,
      },
    );
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
