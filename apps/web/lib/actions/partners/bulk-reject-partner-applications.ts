"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkRejectPartnersSchema } from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
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

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        name: true,
        slug: true,
        supportEmail: true,
      },
    });

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

    const applicationIds = programEnrollments
      .map(({ applicationId }) => applicationId)
      .filter((id): id is string => Boolean(id));

    const reviewedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.programEnrollment.updateMany({
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

      if (applicationIds.length > 0) {
        await tx.programApplication.updateMany({
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
    });

    waitUntil(
      (async () => {
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

          resolveFraudGroups({
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
          }),
        ]);

        const partnersWithEmail = programEnrollments
          .filter(({ partner }) => partner.email)
          .map(({ partner }) => partner);

        if (partnersWithEmail.length > 0) {
          try {
            await sendBatchEmail(
              partnersWithEmail.map((partner) => ({
                to: partner.email!,
                subject: `Your application to ${program.name} was not approved`,
                variant: "notifications" as const,
                replyTo: program.supportEmail || "noreply",
                react: PartnerApplicationRejected({
                  partner: {
                    name: partner.name ?? "there",
                    email: partner.email!,
                  },
                  program: {
                    name: program.name,
                    slug: program.slug,
                    supportEmail: program.supportEmail ?? undefined,
                  },
                  rejectionReason: undefined,
                  additionalNotes: undefined,
                  canReapplyImmediately: false,
                }),
              })),
            );
          } catch (error) {
            console.error("Failed to send bulk rejection emails", {
              error,
              programId,
            });
          }
        }
      })(),
    );
  });
