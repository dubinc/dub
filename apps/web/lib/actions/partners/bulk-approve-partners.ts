"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import { bulkApprovePartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
export const bulkApprovePartnersAction = authActionClient
  .schema(bulkApprovePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, groupId } = parsedInput;

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
      groupId,
    });

    // Approve the enrollments
    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        status: "approved",
        createdAt: new Date(),
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      },
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
