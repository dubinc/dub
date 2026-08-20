import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { throwIfNoPartnerIdOrTenantId } from "@/lib/partners/throw-if-no-partnerid-tenantid";
import { prisma } from "@/lib/prisma";
import {
  createClawbackSchema,
  createCommissionResponseSchema,
} from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";

// POST /api/clawbacks – create a clawback for a partner
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { partnerId, tenantId, amount, reason } = createClawbackSchema.parse(
      await parseRequestBody(req),
    );

    throwIfNoPartnerIdOrTenantId({
      partnerId,
      tenantId,
    });

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

    await getProgramEnrollmentOrThrow({
      programId,
      partnerId: partnerId!,
      include: {},
    });

    await queuePartnerCommissionCreation({
      event: "custom",
      partnerId: partnerId!,
      programId,
      description: reason,
      amount: -amount,
      quantity: 1,
      userId: session.user.id,
      triggerAggregateDueCommissions: true,
    });

    return NextResponse.json(
      createCommissionResponseSchema.parse({
        success: true,
        message: "Your clawback is being created and will appear shortly.",
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
