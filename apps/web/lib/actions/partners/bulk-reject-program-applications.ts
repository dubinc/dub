"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { DubApiError } from "@/lib/api/errors";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { prisma } from "@/lib/prisma";
import { bulkRejectProgramApplicationsSchema } from "@/lib/zod/schemas/program-application";
import { sendBatchEmail } from "@dub/email";
import ProgramApplicationRejected from "@dub/email/templates/program-application-rejected";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Only these enrollments are rejected along with the application. Any other
// status (approved, banned, deactivated, ...) is left untouched.
const ENROLLMENT_STATUSES_TO_REJECT: ProgramEnrollmentStatus[] = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.rejected,
];

// Reject the pending program application of each partner
export const bulkRejectProgramApplicationsAction = authActionClient
  .inputSchema(bulkRejectProgramApplicationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // A partner has at most one pending application per program
    const [program, programApplications, programEnrollments] =
      await Promise.all([
        prisma.program.findUniqueOrThrow({
          where: {
            id: programId,
          },
          select: {
            name: true,
            slug: true,
            supportEmail: true,
          },
        }),

        prisma.programApplication.findMany({
          where: {
            programId,
            partnerId: {
              in: partnerIds,
            },
            status: ProgramApplicationStatus.pending,
          },
          select: {
            id: true,
            partnerId: true,
            partner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),

        prisma.programEnrollment.findMany({
          where: {
            programId,
            partnerId: {
              in: partnerIds,
            },
          },
          select: {
            id: true,
            partnerId: true,
            status: true,
          },
        }),
      ]);

    if (programApplications.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "No pending applications found.",
      });
    }

    const enrollmentsByPartnerId = new Map(
      programEnrollments.map((enrollment) => [
        enrollment.partnerId,
        enrollment,
      ]),
    );

    // Every pending application is rejected. Approved partners are applying to
    // join another group, and banned/deactivated/archived partners were already
    // removed, so their enrollment is left untouched
    const reviews = programApplications.map((application) => {
      const enrollment = enrollmentsByPartnerId.get(application.partnerId!);

      const isNewApplication =
        !enrollment ||
        ENROLLMENT_STATUSES_TO_REJECT.includes(enrollment.status);

      const isApplyingToAdditionalGroup =
        enrollment?.status === ProgramEnrollmentStatus.approved;

      // Partners removed from the program are not emailed
      const shouldEmailPartner =
        isNewApplication || isApplyingToAdditionalGroup;

      return {
        application,
        partnerId: application.partnerId!,
        enrollmentToReject: isNewApplication ? enrollment : undefined,
        isNewApplication,
        isApplyingToAdditionalGroup,
        shouldEmailPartner,
      };
    });

    const enrollmentIdsToReject = reviews.flatMap(({ enrollmentToReject }) =>
      enrollmentToReject ? [enrollmentToReject.id] : [],
    );

    const newApplicationPartnerIds = reviews
      .filter(({ isNewApplication }) => isNewApplication)
      .map(({ partnerId }) => partnerId);

    await prisma.$transaction(async (tx) => {
      const { count: rejectedApplicationsCount } =
        await tx.programApplication.updateMany({
          where: {
            id: {
              in: reviews.map(({ application }) => application.id),
            },
            status: ProgramApplicationStatus.pending,
          },
          data: {
            status: ProgramApplicationStatus.rejected,
            reviewedAt: new Date(),
            rejectionReason: null,
            rejectionNote: null,
            userId: user.id,
          },
        });

      if (rejectedApplicationsCount !== reviews.length) {
        throw new DubApiError({
          code: "conflict",
          message:
            "Some of the selected applications were already reviewed. Refresh and try again.",
        });
      }

      if (enrollmentIdsToReject.length === 0) {
        return;
      }

      const { count: rejectedEnrollmentsCount } =
        await tx.programEnrollment.updateMany({
          where: {
            id: {
              in: enrollmentIdsToReject,
            },
            status: {
              in: ENROLLMENT_STATUSES_TO_REJECT,
            },
          },
          data: {
            status: ProgramEnrollmentStatus.rejected,
            reapplicationTimeframe: "standard",
            clickRewardId: null,
            leadRewardId: null,
            saleRewardId: null,
            referralRewardId: null,
            customRewardId: null,
            discountId: null,
          },
        });

      if (rejectedEnrollmentsCount !== enrollmentIdsToReject.length) {
        throw new DubApiError({
          code: "conflict",
          message:
            "Some of the selected partners changed status. Refresh and try again.",
        });
      }
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          // Queue an index update because the enrollment statuses moved to rejected
          queuePartnerSearchSync({
            enrollmentIds: enrollmentIdsToReject,
          }),

          trackActivityLog(
            reviews.map(({ partnerId }) => ({
              workspaceId: workspace.id,
              programId,
              resourceType: "partner",
              resourceId: partnerId,
              userId: user.id,
              action: "partner_application.rejected",
              changeSet: {
                status: {
                  old: ProgramApplicationStatus.pending,
                  new: ProgramApplicationStatus.rejected,
                },
              },
            })),
          ),

          newApplicationPartnerIds.length > 0 &&
            resolveFraudGroups({
              where: {
                programId,
                partnerId: {
                  in: newApplicationPartnerIds,
                },
              },
              userId: user.id,
              resolutionReason:
                "Resolved automatically because the partner application was rejected.",
            }),

          trackApplicationEvents({
            event: "rejected",
            programId,
            partnerIds: newApplicationPartnerIds,
          }),
        ]);

        const emails = reviews.flatMap(
          ({
            application: { partner },
            isApplyingToAdditionalGroup,
            shouldEmailPartner,
          }) =>
            partner?.email && shouldEmailPartner
              ? [
                  {
                    to: partner.email,
                    subject: isApplyingToAdditionalGroup
                      ? `Your request to join a new group in ${program.name} was not approved`
                      : `Your application to ${program.name} was not approved`,
                    variant: "notifications" as const,
                    replyTo: program.supportEmail || "noreply",
                    react: ProgramApplicationRejected({
                      partner: {
                        name: partner.name ?? "there",
                        email: partner.email,
                      },
                      program: {
                        name: program.name,
                        slug: program.slug,
                        supportEmail: program.supportEmail ?? undefined,
                      },
                      isApplyingToAdditionalGroup,
                      rejectionReason: undefined,
                      additionalNotes: undefined,
                      reapplicationTimeframe: "standard",
                    }),
                  },
                ]
              : [],
        );

        if (emails.length > 0) {
          await sendBatchEmail(emails);
        }
      })(),
    );

    return {
      rejectedCount: reviews.length,
      skippedCount: partnerIds.length - reviews.length,
    };
  });
