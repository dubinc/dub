"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { throwIfTrialProgramEnrollmentLimitExceeded } from "@/lib/partners/throw-if-trial-program-enrollment-exceeded";
import { bulkApprovePartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Approve partners applications in bulk
export const bulkApprovePartnersAction = authActionClient
  .inputSchema(bulkApprovePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, groupId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partners: programEnrollments, ...program } =
      await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          partners: {
            where: {
              status: "pending",
              partnerId: {
                in: partnerIds,
              },
            },
          },
        },
      });

    const group = await getGroupOrThrow({
      programId: program.id,
      groupId: groupId ?? program.defaultGroupId,
    });

    await throwIfTrialProgramEnrollmentLimitExceeded({
      programId: program.id,
      additionalApproved: programEnrollments.length,
      trialEndsAt: workspace.trialEndsAt,
    });

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.programEnrollment.updateMany({
        where: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
        data: {
          status: "approved",
          createdAt: now,
          groupId: group.id,
          clickRewardId: group.clickRewardId,
          leadRewardId: group.leadRewardId,
          saleRewardId: group.saleRewardId,
          discountId: group.discountId,
        },
      });

      const applicationIds = programEnrollments
        .map(({ applicationId }) => applicationId)
        .filter((id): id is string => Boolean(id));

      if (applicationIds.length > 0) {
        await tx.programApplication.updateMany({
          where: {
            id: {
              in: applicationIds,
            },
          },
          data: {
            reviewedAt: now,
            rejectionReason: null,
            rejectionNote: null,
            userId: user.id,
          },
        });
      }
    });

    waitUntil(
      (async () => {
        // Refetch the updated program enrollments with the partner
        const updatedEnrollments = await prisma.programEnrollment.findMany({
          where: {
            id: {
              in: programEnrollments.map(({ id }) => id),
            },
          },
          include: {
            partner: true,
          },
        });

        await Promise.allSettled([
          recordAuditLog(
            updatedEnrollments.map(({ partner }) => ({
              workspaceId: workspace.id,
              programId: program.id,
              action: "partner_application.approved",
              description: `Partner application approved for ${partner.id}`,
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

          triggerWorkflows(
            updatedEnrollments.map(({ partnerId, programId }) => ({
              workflowId: "partner-approved",
              body: {
                programId,
                partnerId,
                userId: user.id,
              },
            })),
          ),
        ]);
      })(),
    );
  });
