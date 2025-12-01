"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { resolveFraudEventGroups } from "@/lib/api/fraud/resolve-fraud-event-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { bulkBanPartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const bulkBanPartnersAction = authActionClient
  .schema(bulkBanPartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, reason } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
        status: {
          not: "banned",
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Don't throw an error if no partners are found, just return
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
        status: ProgramEnrollmentStatus.banned,
        bannedAt: new Date(),
        bannedReason: reason,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    });

    await resolveFraudEventGroups({
      where: {
        programEnrollment: {
          id: {
            in: programEnrollments.map(({ id }) => id),
          },
        },
      },
      userId: user.id,
      resolutionReason:
        "Resolved automatically because the partner was banned.",
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog(
          programEnrollments.map(({ partner }) => ({
            workspaceId: workspace.id,
            programId,
            action: "partner.banned",
            description: `Partner ${partner.id} banned`,
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

        enqueueBatchJobs(
          programEnrollments.map(({ programId, partnerId }) => ({
            queueName: "ban-partner",
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/ban/process`,
            deduplicationId: `ban-${programId}-${partnerId}`,
            body: {
              programId,
              partnerId,
              userId: user.id,
            },
          })),
        ),
      ]),
    );
  });
