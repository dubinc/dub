"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Reject a pending partner application
export const rejectPartnerApplicationAction = authActionClient
  .inputSchema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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

    // Don't do anything if the application is no longer pending
    if (programEnrollment.status !== "pending") {
      return;
    }

    await prisma.programEnrollment.update({
      where: {
        id: programEnrollment.id,
        status: "pending",
      },
      data: {
        status: ProgramEnrollmentStatus.rejected,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
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

          // Automatically resolve all pending fraud events for this partner in the current program
          resolveFraudGroups({
            where: {
              programId,
              partnerId,
            },
            userId: user.id,
            resolutionReason:
              "Resolved automatically because the partner application was rejected.",
          }),
        ]);
      })(),
    );
  });
