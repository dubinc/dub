"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { throwIfPartnersLimitExceeded } from "@/lib/partners/throw-if-partners-limit-exceeded";
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

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const { count: approvedEnrollmentsCount } =
        await tx.programEnrollment.updateMany({
          where: {
            id: {
              in: programEnrollments.map(({ id }) => id),
            },
            status: "pending",
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

      throwIfPartnersLimitExceeded({
        ...workspace,
        additionalEnrollments: approvedEnrollmentsCount,
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

      if (approvedEnrollmentsCount > 0) {
        await tx.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            partnersUsage: {
              increment: approvedEnrollmentsCount,
            },
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
          trackActivityLog(
            updatedEnrollments.map(({ partnerId }) => ({
              workspaceId: workspace.id,
              programId: program.id,
              resourceType: "partner",
              resourceId: partnerId,
              userId: user.id,
              action: "partner_application.approved",
              changeSet: {
                status: {
                  old: "pending",
                  new: "approved",
                },
              },
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

          trackApplicationEvents({
            event: "approved",
            programId: program.id,
            partnerIds: updatedEnrollments.map(({ partnerId }) => partnerId),
          }),
        ]);
      })(),
    );
  });
