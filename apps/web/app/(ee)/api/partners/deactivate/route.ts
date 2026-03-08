import { DubApiError } from "@/lib/api/errors";
import { deactivatePartner } from "@/lib/api/partners/deactivate-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";

import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { deactivatePartnerApiSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/partners/deactivate – Deactivate a partner via API
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    let { partnerId, tenantId } = deactivatePartnerApiSchema.parse(
      await parseRequestBody(req),
    );

    throwIfNoPartnerIdOrTenantId({
      partnerId,
      tenantId,
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (tenantId && !partnerId) {
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

    await deactivatePartner({
      workspaceId: workspace.id,
      programId,
      partnerId: partnerId!, // coerce here because we're already throwing if no partnerId or tenantId
      user: session.user,
    });

    return NextResponse.json({
      partnerId,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
