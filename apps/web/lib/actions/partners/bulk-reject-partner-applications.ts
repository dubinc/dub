"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkRejectPartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Reject a list of pending partners
export const bulkRejectPartnerApplicationsAction = authActionClient
  .inputSchema(bulkRejectPartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

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
        applicationId: true,
        partner: true,
      },
    });

    if (programEnrollments.length === 0) {
      return;
    }

    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        status: ProgramEnrollmentStatus.rejected,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    });

    const applicationIds = programEnrollments
      .map(({ applicationId }) => applicationId)
      .filter((id): id is string => Boolean(id));

    if (applicationIds.length > 0) {
      const reviewedAt = new Date();

      await prisma.programApplication.updateMany({
        where: {
          id: {
            in: applicationIds,
          },
        },
        data: {
          reviewedAt,
          rejectionReason: null,
          rejectionNote: null,
          userId: user.id,
        },
      });
    }

    await resolveFraudGroups({
      where: {
        programEnrollment: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
      },
      userId: user.id,
      resolutionReason:
        "Resolved automatically because the partner application was rejected.",
    });

    waitUntil(
      Promise.allSettled([
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
      ]),
    );
  });
