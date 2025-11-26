import { banPartner } from "@/lib/actions/partners/ban-partner";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { banPartnerApiSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/partners/ban – Ban a partner via API
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    let { partnerId, tenantId, reason } = banPartnerApiSchema.parse(
      await parseRequestBody(req),
    );

    throwIfNoPartnerIdOrTenantId({ partnerId, tenantId });

    if (tenantId && !partnerId) {
      const programId = getDefaultProgramIdOrThrow(workspace);

      const programEnrollment = await prisma.programEnrollment.findUnique({
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

      if (!programEnrollment) {
        throw new DubApiError({
          code: "not_found",
          message: `Partner with tenantId ${tenantId} not found in program.`,
        });
      }

      partnerId = programEnrollment.partnerId;
    }

    const response = await banPartner({
      workspace,
      partnerId: partnerId!, // coerce here because we're already throwing if no partnerId or tenantId
      reason,
      user: session.user,
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
