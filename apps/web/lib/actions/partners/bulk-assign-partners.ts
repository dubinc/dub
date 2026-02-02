"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkAssignPartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const bulkAssignPartnersAction = authActionClient
  .inputSchema(bulkAssignPartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, managerUserId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // If assigning (not unassigning), verify the user is a workspace member
    if (managerUserId) {
      const member = await prisma.projectUsers.findFirst({
        where: {
          userId: managerUserId,
          projectId: workspace.id,
        },
      });
      if (!member) {
        throw new Error("The selected user is not a member of this workspace.");
      }
    }

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: { in: partnerIds },
        programId,
        status: "approved",
      },
      select: {
        id: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("You must provide at least one valid active partner ID.");
    }

    await prisma.programEnrollment.updateMany({
      where: {
        partnerId: { in: partnerIds },
        programId,
        status: "approved",
      },
      data: {
        managerUserId,
      },
    });

    waitUntil(
      recordAuditLog(
        programEnrollments.map(({ partner }) => ({
          workspaceId: workspace.id,
          programId,
          action: managerUserId
            ? "partner.assigned"
            : "partner.unassigned",
          description: managerUserId
            ? `Partner ${partner.id} assigned to user ${managerUserId}`
            : `Partner ${partner.id} unassigned`,
          actor: user,
          targets: [
            {
              type: "partner" as const,
              id: partner.id,
              metadata: partner,
            },
          ],
        })),
      ),
    );
  });
