"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramApplicationRejectionReasonLabel } from "@/lib/partners/program-application-rejection";
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

    await prisma.$transaction(async (tx) => {
      if (programEnrollment.applicationId) {
        await tx.programApplication.update({
          where: {
            id: programEnrollment.applicationId,
          },
          data: {
            reviewedAt: new Date(),
            rejectionReason,
            rejectionNote,
            userId: user.id,
          },
        });
      }

      // If the partner can immediately re-apply, delete the application
      if (allowImmediateReapply) {
        await tx.programEnrollment.deleteMany({
          where: {
            id: programEnrollment.id,
            status: "pending",
          },
        });

        return;
      }

      // If the partner cannot immediately re-apply, reject the application
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
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          trackActivityLog({
            workspaceId: workspace.id,
            programId,
            resourceType: "partner",
            resourceId: partnerId,
            userId: user.id,
            action: "partner_application.rejected",
            changeSet: {
              status: {
                old: "pending",
                new: "rejected",
              },
            },
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

        const { partner, program } = programEnrollment;

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
                rejectionReason:
                  getProgramApplicationRejectionReasonLabel(rejectionReason),
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
