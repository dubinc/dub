import { banPartner } from "@/lib/actions/partners/ban-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { banPartnerApiSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/partners/ban – Ban a partner via API
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    let { partnerId, tenantId, reason } = banPartnerApiSchema.parse(
      await req.json(),
    );

    throwIfNoPartnerIdOrTenantId({ partnerId, tenantId });

    if (tenantId && !partnerId) {
      const programId = getDefaultProgramIdOrThrow(workspace);
      const partner = await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          tenantId_programId: {
            tenantId,
            programId,
          },
        },
      });
      partnerId = partner.partnerId;
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
