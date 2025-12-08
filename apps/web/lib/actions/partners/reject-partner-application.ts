"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  INACTIVE_ENROLLMENT_STATUSES,
  rejectPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import {
  FraudRuleType,
  ProgramEnrollment,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Reject a pending partner application
export const rejectPartnerApplicationAction = authActionClient
  .schema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, reportFraud } = parsedInput;

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
        let otherProgramEnrollments: Pick<ProgramEnrollment, "programId">[] =
          [];

        if (reportFraud) {
          otherProgramEnrollments = await prisma.programEnrollment.findMany({
            where: {
              partnerId,
              programId: {
                not: programId,
              },
              status: {
                notIn: INACTIVE_ENROLLMENT_STATUSES,
              },
            },
            select: {
              programId: true,
            },
          });
        }

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

          // Create fraud report events in other programs where this partner is enrolled
          // to help keep the network safe by alerting other programs about suspected fraud
          createFraudEvents(
            otherProgramEnrollments.map(({ programId }) => ({
              programId,
              partnerId,
              type: FraudRuleType.partnerFraudReport,
            })),
          ),
        ]);
      })(),
    );
  });
