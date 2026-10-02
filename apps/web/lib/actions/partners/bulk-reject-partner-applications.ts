"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { prisma } from "@/lib/prisma";
import { bulkRejectPartnersSchema } from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
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

    const reviewedAt = new Date();

    const rejectedEnrollmentIds = await prisma.$transaction(async (tx) => {
      const transitionedIds = new Set<string>();

      for (const { id } of programEnrollments) {
        const { count } = await tx.programEnrollment.updateMany({
          where: {
            id,
            status: ProgramEnrollmentStatus.pending,
          },
          data: {
            status: ProgramEnrollmentStatus.rejected,
            clickRewardId: null,
            leadRewardId: null,
            saleRewardId: null,
            referralRewardId: null,
            customRewardId: null,
            discountId: null,
          },
        });

        if (count > 0) {
          transitionedIds.add(id);
        }
      }

      const applicationIds = programEnrollments
        .filter(({ id }) => transitionedIds.has(id))
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
            status: ProgramApplicationStatus.rejected,
            reviewedAt,
            rejectionReason: null,
            rejectionNote: null,
            userId: user.id,
          },
        });
      }

      return transitionedIds;
    });

    // Find the rejected enrollments
    const rejectedEnrollments = programEnrollments.filter(({ id }) =>
      rejectedEnrollmentIds.has(id),
    );

    if (rejectedEnrollments.length === 0) {
      return;
    }

    waitUntil(
      (async () => {
        await Promise.allSettled([
          // Queue an index update because the enrollment statuses moved to rejected
          queuePartnerSearchSync({
            enrollmentIds: rejectedEnrollments.map(({ id }) => id),
          }),

          trackActivityLog(
            rejectedEnrollments.map(({ partner }) => ({
              workspaceId: workspace.id,
              programId,
              resourceType: "partner",
              resourceId: partner.id,
              userId: user.id,
              action: "partner_application.rejected",
              changeSet: {
                status: {
                  old: "pending",
                  new: "rejected",
                },
              },
            })),
          ),

          resolveFraudGroups({
            where: {
              programEnrollment: {
                id: {
                  in: rejectedEnrollments.map(({ id }) => id),
                },
              },
            },
            userId: user.id,
            resolutionReason:
              "Resolved automatically because the partner application was rejected.",
          }),

          trackApplicationEvents({
            event: "rejected",
            programId,
            partnerIds: rejectedEnrollments.map(({ partner }) => partner.id),
          }),
        ]);

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

        const partnersWithEmail = rejectedEnrollments
          .filter(({ partner }) => partner.email)
          .map(({ partner }) => partner);

        if (partnersWithEmail.length > 0) {
          await sendBatchEmail(
            partnersWithEmail.map((partner) => ({
              to: partner.email!,
              subject: `Your application to ${program.name} was not approved`,
              variant: "notifications",
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
                reapplicationTimeframe: "standard",
              }),
            })),
          );
        }
      })(),
    );
  });
