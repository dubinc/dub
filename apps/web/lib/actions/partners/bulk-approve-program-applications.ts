"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { movePartnersToGroup } from "@/lib/api/groups/move-partners-to-group";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { throwIfPartnersLimitExceeded } from "@/lib/partners/throw-if-partners-limit-exceeded";
import { prisma } from "@/lib/prisma";
import { bulkApproveProgramApplicationsSchema } from "@/lib/zod/schemas/program-application";
import { pluck } from "@dub/utils";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const APPROVABLE_APPLICATION_STATUSES: ProgramApplicationStatus[] = [
  ProgramApplicationStatus.pending,
  ProgramApplicationStatus.rejected,
];

const NEW_ENROLLMENT_STATUSES: ProgramEnrollmentStatus[] = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.rejected,
];

// Approve program applications in bulk
export const bulkApproveProgramApplicationsAction = authActionClient
  .inputSchema(bulkApproveProgramApplicationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { applicationIds, groupId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, programApplications] = await Promise.all([
      prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        select: {
          defaultGroupId: true,
        },
      }),

      prisma.programApplication.findMany({
        where: {
          id: {
            in: applicationIds,
          },
          programId,
          partnerId: {
            not: null,
          },
          status: {
            in: APPROVABLE_APPLICATION_STATUSES,
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
        message: "No pending or rejected applications found.",
      });
    }

    const partnerIds = programApplications.map(({ partnerId }) => partnerId!);

    if (new Set(partnerIds).size !== partnerIds.length) {
      throw new DubApiError({
        code: "bad_request",
        message: "Only one application per partner can be approved at a time.",
      });
    }

    const [partnerGroup, programEnrollments] = await Promise.all([
      getGroupOrThrow({
        programId,
        groupId: groupId ?? program.defaultGroupId,
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
          applicationId: true,
        },
      }),
    ]);

    const enrollmentsByPartnerId = new Map(
      programEnrollments.map((enrollment) => [
        enrollment.partnerId,
        enrollment,
      ]),
    );

    const ineligibleApplications: {
      applicationId: string;
      enrollmentStatus: ProgramEnrollmentStatus;
    }[] = [];

    type Review = {
      application: (typeof programApplications)[number];
      partnerId: string;
      enrollmentId: string;
      enrollmentApplicationId: string | null;
      action: "create" | "approve" | "move";
    };

    // Each application either creates an enrollment
    // OR approves an existing pending/rejected enrollment
    // OR moves an approved partner to the new group
    const reviews = programApplications.flatMap((application): Review[] => {
      const partnerId = application.partnerId!;
      const enrollment = enrollmentsByPartnerId.get(partnerId);

      // Create a new enrollment
      if (!enrollment) {
        return [
          {
            application,
            partnerId,
            enrollmentId: createId({ prefix: "pge_" }),
            enrollmentApplicationId: application.id,
            action: "create" as const,
          },
        ];
      }

      // Approve an existing pending/rejected enrollment
      const isPendingOrRejected = NEW_ENROLLMENT_STATUSES.includes(
        enrollment.status,
      );

      // Move an approved partner to the new group
      const isApproved = enrollment.status === ProgramEnrollmentStatus.approved;

      // Skip invited, declined, deactivated, banned, or archived partners so
      // they don't block the rest of the selection
      if (!isPendingOrRejected && !isApproved) {
        ineligibleApplications.push({
          applicationId: application.id,
          enrollmentStatus: enrollment.status,
        });

        return [];
      }

      return [
        {
          application,
          partnerId,
          enrollmentId: enrollment.id,
          enrollmentApplicationId: enrollment.applicationId,
          action: isApproved ? ("move" as const) : ("approve" as const),
        },
      ];
    });

    if (reviews.length === 0) {
      const [ineligibleApplication] = ineligibleApplications;

      throw new DubApiError({
        code: "bad_request",
        message:
          ineligibleApplications.length === 1
            ? `Application ${ineligibleApplication.applicationId} cannot be approved because the partner is ${ineligibleApplication.enrollmentStatus}.`
            : "None of the selected applications can be approved.",
      });
    }

    // Group reviews by action
    const enrollmentsToCreate: Review[] = [];
    const enrollmentsToApprove: Review[] = [];
    const enrollmentsToMove: Review[] = [];

    for (const review of reviews) {
      if (review.action === "create") {
        enrollmentsToCreate.push(review);
      } else if (review.action === "approve") {
        enrollmentsToApprove.push(review);
      } else {
        enrollmentsToMove.push(review);
      }
    }

    const newPartners = [...enrollmentsToCreate, ...enrollmentsToApprove];
    const now = new Date();

    const groupFields = {
      groupId: partnerGroup.id,
      clickRewardId: partnerGroup.clickRewardId,
      leadRewardId: partnerGroup.leadRewardId,
      saleRewardId: partnerGroup.saleRewardId,
      referralRewardId: partnerGroup.referralRewardId,
      customRewardId: partnerGroup.customRewardId,
      discountId: partnerGroup.discountId,
    };

    await prisma.$transaction(async (tx) => {
      if (newPartners.length > 0) {
        throwIfPartnersLimitExceeded({
          ...workspace,
          additionalEnrollments: newPartners.length,
        });
      }

      if (enrollmentsToApprove.length > 0) {
        const { count } = await tx.programEnrollment.updateMany({
          where: {
            id: {
              in: pluck(enrollmentsToApprove, "enrollmentId"),
            },
            status: {
              in: NEW_ENROLLMENT_STATUSES,
            },
          },
          data: {
            status: ProgramEnrollmentStatus.approved,
            createdAt: now,
            ...groupFields,
          },
        });

        if (count !== enrollmentsToApprove.length) {
          throw new DubApiError({
            code: "conflict",
            message:
              "Some of the selected partners changed status. Refresh and try again.",
          });
        }
      }

      if (enrollmentsToCreate.length > 0) {
        const { count } = await tx.programEnrollment.createMany({
          skipDuplicates: true,
          data: enrollmentsToCreate.map(
            ({ enrollmentId, partnerId, application }) => ({
              id: enrollmentId,
              programId,
              partnerId,
              applicationId: application.id,
              status: ProgramEnrollmentStatus.approved,
              createdAt: now,
              ...groupFields,
            }),
          ),
        });

        if (count !== enrollmentsToCreate.length) {
          throw new DubApiError({
            code: "conflict",
            message:
              "Some of the selected partners changed status. Refresh and try again.",
          });
        }
      }

      if (newPartners.length > 0) {
        await tx.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            partnersUsage: {
              increment: newPartners.length,
            },
          },
        });
      }

      const { count: approvedApplicationsCount } =
        await tx.programApplication.updateMany({
          where: {
            id: {
              in: reviews.map(({ application }) => application.id),
            },
            status: {
              in: APPROVABLE_APPLICATION_STATUSES,
            },
          },
          data: {
            status: ProgramApplicationStatus.approved,
            reviewedAt: now,
            rejectionReason: null,
            rejectionNote: null,
            userId: user.id,
          },
        });

      if (approvedApplicationsCount !== reviews.length) {
        throw new DubApiError({
          code: "conflict",
          message:
            "Some of the selected applications were already reviewed. Refresh and try again.",
        });
      }

      // Only enrollments not already linked to the approved application need repointing
      for (const review of reviews) {
        const { application, enrollmentId, enrollmentApplicationId } = review;

        if (enrollmentApplicationId === application.id) {
          continue;
        }

        await tx.programEnrollment.update({
          where: {
            id: enrollmentId,
          },
          data: {
            applicationId: application.id,
          },
        });
      }
    });

    if (enrollmentsToMove.length > 0) {
      await movePartnersToGroup({
        workspaceId: workspace.id,
        programId,
        partnerIds: pluck(enrollmentsToMove, "partnerId"),
        userId: user.id,
        group: partnerGroup,
      });
    }

    waitUntil(
      Promise.allSettled([
        trackActivityLog(
          reviews.map(({ application, partnerId }) => ({
            workspaceId: workspace.id,
            programId,
            resourceType: "partner",
            resourceId: partnerId,
            userId: user.id,
            action: "partner_application.approved",
            changeSet: {
              status: {
                old: application.status,
                new: ProgramApplicationStatus.approved,
              },
            },
          })),
        ),

        // Partners moved to another group were already approved
        newPartners.length > 0 &&
          trackApplicationEvents({
            event: "approved",
            programId,
            partnerIds: pluck(newPartners, "partnerId"),
          }),

        // Queue an index update because the enrollment statuses moved to approved
        queuePartnerSearchSync({
          enrollmentIds: pluck(reviews, "enrollmentId"),
        }),

        newPartners.length > 0 &&
          dispatchWorkflows(
            newPartners.map(({ partnerId }) => ({
              name: "partner-approved-workflow",
              payload: {
                programId,
                partnerId,
                userId: user.id,
              },
              options: {
                label: partnerId,
              },
            })),
          ),
      ]),
    );

    return {
      approvedCount: reviews.length,
      skippedCount: applicationIds.length - reviews.length,
    };
  });
