"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { updatePartnerEnrollmentSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Update a partner's program enrollment data
export const updatePartnerEnrollmentAction = authActionClient
  .schema(updatePartnerEnrollmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, tenantId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partner } = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    const where = {
      programId,
      partnerId,
    };

    await prisma.$transaction([
      prisma.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          tenantId,
        },
      }),

      prisma.link.updateMany({
        where,
        data: {
          tenantId,
        },
      }),
    ]);

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner.enrollment_updated",
        description: `Partner ${partnerId} enrollment updated`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partnerId,
            metadata: partner,
          },
        ],
      }),
    );
  });
