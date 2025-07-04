"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Reject a pending partner
export const rejectPartnerAction = authActionClient
  .schema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      include: {
        partner: true,
      },
    });

    if (programEnrollment.status !== "pending") {
      throw new Error("Program enrollment is not pending.");
    }

    await prisma.programEnrollment.update({
      where: {
        id: programEnrollment.id,
      },
      data: {
        status: "rejected",
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner_application.rejected",
        description: `Partner application rejected for ${partnerId}`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partnerId,
            metadata: programEnrollment.partner,
          },
        ],
      }),
    );
  });
