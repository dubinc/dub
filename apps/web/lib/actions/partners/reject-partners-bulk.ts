"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectPartnersBulkSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Reject a list of pending partners
export const rejectPartnersBulkAction = authActionClient
  .schema(rejectPartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        status: "pending",
        partnerId: {
          in: partnerIds,
        },
      },
      select: {
        id: true,
        partner: true,
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("No pending program enrollments found to reject.");
    }

    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        status: ProgramEnrollmentStatus.rejected,
      },
    });

    waitUntil(
      recordAuditLog(
        programEnrollments.map(({ partner }) => ({
          workspaceId: workspace.id,
          programId,
          action: "partner_application.rejected",
          description: `Partner application rejected for ${partner.id}`,
          actor: user,
          targets: [
            {
              type: "partner",
              id: partner.id,
              metadata: partner,
            },
          ],
        })),
      ),
    );
  });
