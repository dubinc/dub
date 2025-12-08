"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  bulkRejectPartnersSchema,
  NON_ACTIVE_ENROLLMENT_STATUSES,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { FraudRuleType, ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Reject a list of pending partners
export const bulkRejectPartnerApplicationsAction = authActionClient
  .schema(bulkRejectPartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, reportFraud } = parsedInput;

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
      (async () => {
        const otherProgramEnrollments = reportFraud
          ? await prisma.programEnrollment.findMany({
              where: {
                partnerId: {
                  in: partnerIds,
                },
                programId: {
                  not: programId,
                },
                status: {
                  notIn: NON_ACTIVE_ENROLLMENT_STATUSES,
                },
              },
              select: {
                programId: true,
                partnerId: true,
              },
            })
          : [];

        await Promise.allSettled([
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

          // Create fraud report events in other programs where these partners are enrolled
          // to help keep the network safe by alerting other programs about suspected fraud
          createFraudEvents(
            otherProgramEnrollments.map(({ programId, partnerId }) => ({
              programId,
              partnerId,
              type: FraudRuleType.partnerFraudReport,
            })),
          ),
        ]);
      })(),
    );
  });
