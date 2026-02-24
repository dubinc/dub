import { getCommissions } from "@/lib/api/commissions/get-commissions";
import { transformCustomerForCommission } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  CommissionEnrichedSchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/commissions - get all commissions for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const isHoldStatus = searchParams.status === "hold";
  const { status: _status, ...restSearchParams } = searchParams;

  let { partnerId, tenantId, ...filters } = getCommissionsQuerySchema.parse(
    isHoldStatus ? restSearchParams : searchParams,
  );

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
    isHoldStatus,
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
