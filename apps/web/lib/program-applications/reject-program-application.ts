import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { DubApiError } from "@/lib/api/errors";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { prisma } from "@/lib/prisma";
import { getProgramApplicationRejectionReasonLabel } from "@/lib/program-applications/program-application-rejection";
import { rejectProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import { sendEmail } from "@dub/email";
import ProgramApplicationRejected from "@dub/email/templates/program-application-rejected";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

type RejectProgramApplicationInput = z.infer<
  typeof rejectProgramApplicationSchema
> & {
  programId: string;
  applicationId?: string;
  userId?: string;
};

const REJECTABLE_ENROLLMENT_STATUSES: ProgramEnrollmentStatus[] = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.rejected,
];

export async function rejectProgramApplication({
  programId,
  applicationId,
  partnerId,
  rejectionReason,
  rejectionNote,
  reapplicationTimeframe,
  flagForFraud,
  flagForFraudReason,
  userId,
}: RejectProgramApplicationInput) {
  if (flagForFraud && reapplicationTimeframe === "instant") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Cannot flag for fraud when allowing the partner to reapply immediately.",
    });
  }

  if (flagForFraud && (!flagForFraudReason || !flagForFraudReason.trim())) {
    throw new DubApiError({
      code: "bad_request",
      message: "Fraud reason is required when flagging for fraud.",
    });
  }

  const [programApplication, existingEnrollment] = await Promise.all([
    prisma.programApplication.findFirst({
      where: {
        ...(applicationId && { id: applicationId }),
        programId,
        partnerId,
        status: ProgramApplicationStatus.pending,
      },
      select: {
        id: true,
        partner: {
          select: {
            name: true,
            email: true,
          },
        },
        program: {
          select: {
            name: true,
            slug: true,
            supportEmail: true,
            workspace: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  if (!programApplication) {
    throw new DubApiError({
      code: "not_found",
      message: "No pending application found.",
    });
  }

  // Approved partners are applying to join another group, so only the
  // application is rejected and their enrollment is left untouched
  const isApplyingToAdditionalGroup =
    existingEnrollment?.status === ProgramEnrollmentStatus.approved;

  // Banned, deactivated, and archived partners were already removed, so only
  // the application is rejected and their enrollment is left untouched
  const enrollmentToReject =
    existingEnrollment &&
    REJECTABLE_ENROLLMENT_STATUSES.includes(existingEnrollment.status)
      ? existingEnrollment
      : null;

  const isNewApplication = !existingEnrollment || !!enrollmentToReject;

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.programApplication.updateMany({
      where: {
        id: programApplication.id,
        status: ProgramApplicationStatus.pending,
      },
      data: {
        status: ProgramApplicationStatus.rejected,
        reviewedAt: new Date(),
        rejectionReason,
        rejectionNote,
        userId,
      },
    });

    if (count === 0) {
      throw new DubApiError({
        code: "conflict",
        message:
          "This application was already reviewed. Refresh and try again.",
      });
    }

    if (flagForFraud && flagForFraudReason) {
      await tx.fraudAlert.create({
        data: {
          partnerId,
          programId,
          reason: flagForFraudReason,
        },
      });
    }

    if (!isNewApplication) {
      return;
    }

    if (enrollmentToReject) {
      // If the partner can immediately re-apply, delete the enrollment
      if (reapplicationTimeframe === "instant") {
        const { count } = await tx.programEnrollment.deleteMany({
          where: {
            id: enrollmentToReject.id,
            status: {
              in: REJECTABLE_ENROLLMENT_STATUSES,
            },
          },
        });

        if (count !== 1) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "This enrollment cannot be deleted because it is no longer pending.",
          });
        }

        return;
      }

      // Reject the enrollment and persist the reapplication timeframe
      await tx.programEnrollment.update({
        where: {
          id: enrollmentToReject.id,
          status: {
            in: REJECTABLE_ENROLLMENT_STATUSES,
          },
        },
        data: {
          status: ProgramEnrollmentStatus.rejected,
          reapplicationTimeframe,
          clickRewardId: null,
          leadRewardId: null,
          saleRewardId: null,
          referralRewardId: null,
          customRewardId: null,
          discountId: null,
        },
      });
    }
  });

  const { partner, program } = programApplication;

  waitUntil(
    Promise.allSettled([
      // Queue an index update because the enrollment was either rejected or deleted.
      // The job reads the ID back, so this does not need to know which.
      enrollmentToReject &&
        queuePartnerSearchSync({ enrollmentIds: [enrollmentToReject.id] }),

      trackActivityLog({
        workspaceId: program.workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId,
        action: "partner_application.rejected",
        changeSet: {
          status: {
            old: ProgramApplicationStatus.pending,
            new: ProgramApplicationStatus.rejected,
          },
        },
      }),

      isNewApplication &&
        trackApplicationEvents({
          event: "rejected",
          programId,
          partnerIds: [partnerId],
        }),

      isNewApplication &&
        resolveFraudGroups({
          where: {
            programId,
            partnerId,
          },
          userId,
          resolutionReason:
            "Resolved automatically because the partner application was rejected.",
        }),

      // Email when there is no enrollment or it is pending/rejected (program
      // application), or when the partner is approved and applying to another
      // group. Banned, deactivated, archived, invited, and declined enrollments
      // are left unchanged, so those partners are not emailed.
      partner?.email &&
        (isNewApplication || isApplyingToAdditionalGroup) &&
        sendEmail({
          to: partner.email,
          subject: isApplyingToAdditionalGroup
            ? `Your request to join a new group in ${program.name} was not approved`
            : `Your application to ${program.name} was not approved`,
          variant: "notifications",
          replyTo: program.supportEmail || "noreply",
          react: ProgramApplicationRejected({
            partner: {
              name: partner.name ?? "there",
              email: partner.email,
            },
            program: {
              name: program.name,
              slug: program.slug,
              supportEmail: program.supportEmail,
            },
            isApplyingToAdditionalGroup,
            additionalNotes: rejectionNote,
            rejectionReason:
              getProgramApplicationRejectionReasonLabel(rejectionReason),
            reapplicationTimeframe,
          }),
        }),
    ]),
  );

  return {
    isApplyingToAdditionalGroup,
  };
}
