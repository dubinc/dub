"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { PROGRAM_APPLICATION_REJECTION_REASON_LABELS } from "@/lib/partners/program-application-rejection";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
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
    const { partnerId, rejectionReason, rejectionNote, allowImmediateReapply } =
      parsedInput;

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
        program: {
          select: {
            name: true,
            slug: true,
            supportEmail: true,
          },
        },
      },
    });

    // Don't do anything if the application is no longer pending
    if (programEnrollment.status !== "pending") {
      return;
    }

    const reviewedAt = new Date();

    await prisma.$transaction(async (tx) => {
      if (allowImmediateReapply) {
        if (programEnrollment.applicationId) {
          await tx.programApplication.update({
            where: { id: programEnrollment.applicationId },
            data: {
              reviewedAt,
              rejectionReason: rejectionReason ?? null,
              rejectionNote: rejectionNote ?? null,
            },
          });
        }

        const { count } = await tx.programEnrollment.deleteMany({
          where: {
            id: programEnrollment.id,
            status: "pending",
          },
        });

        if (count === 0) {
          throw new Error(
            "This application is no longer pending and could not be removed.",
          );
        }
      } else {
        await tx.programEnrollment.update({
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

        if (programEnrollment.applicationId) {
          await tx.programApplication.update({
            where: { id: programEnrollment.applicationId },
            data: {
              reviewedAt,
              rejectionReason: rejectionReason ?? null,
              rejectionNote: rejectionNote ?? null,
            },
          });
        }
      }
    });

    const { partner, program } = programEnrollment;

    const rejectionReasonLabel =
      rejectionReason != null
        ? PROGRAM_APPLICATION_REJECTION_REASON_LABELS[rejectionReason]
        : undefined;

    waitUntil(
      (async () => {
        await Promise.allSettled([
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner_application.rejected",
            description: `Partner application rejected (${partnerId})`,
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

        if (partner.email) {
          try {
            await sendEmail({
              to: partner.email,
              subject: `Your application to ${program.name} was not approved`,
              variant: "notifications",
              replyTo: program.supportEmail || "noreply",
              react: PartnerApplicationRejected({
                partner: {
                  name: partner.name ?? "there",
                  email: partner.email,
                },
                program: {
                  name: program.name,
                  slug: program.slug,
                  supportEmail: program.supportEmail ?? undefined,
                },
                rejectionReason: rejectionReasonLabel,
                additionalNotes: rejectionNote ?? undefined,
                canReapplyImmediately: allowImmediateReapply,
              }),
            });
          } catch (error) {
            console.error(
              "Failed to send partner application rejection email",
              {
                error,
                partnerId,
                programId,
              },
            );
          }
        }
      })(),
    );
  });
