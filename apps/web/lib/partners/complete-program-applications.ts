import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { detectAndRecordFraudApplication } from "../api/fraud/detect-record-fraud-application";
import { notifyProgramApplication } from "../api/partners/notify-program-application";
import { queuePartnerSearchSync } from "../api/partners/queue-partner-search-sync";
import { markApplicationEventSubmitted } from "../application-events/update-application-event";
import { autoApproveProgramApplicationJob } from "../jobs/handlers/auto-approve-program-application-job";
import { autoRejectProgramApplicationJob } from "../jobs/handlers/auto-reject-program-application-job";
import { sendWorkspaceWebhook } from "../webhook/publish";
import {
  partnerApplicationWebhookSchema,
  programApplicationWebhookSchema,
} from "../zod/schemas/program-application";
import {
  backfillPartnerPlatforms,
  mergeApplicationSocialPlatforms,
} from "./backfill-partner-platforms";
import { evaluateApplicationRequirements } from "./evaluate-application-requirements";
import {
  formatApplicationFormData,
  formatWebsiteAndSocialsFields,
} from "./format-application-form-data";

/**
 * Completes any outstanding program applications for a user
 * by creating a program enrollment for each
 */
export async function completeProgramApplications(userEmail: string) {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email: userEmail,
      },
      select: {
        partners: {
          select: {
            partnerId: true,
            partner: {
              include: {
                platforms: true,
                programs: {
                  select: {
                    programId: true,
                    tenantId: true,
                    status: true,
                    groupId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user.partners.length) {
      return;
    }

    const programApplications = await prisma.programApplication.findMany({
      where: {
        email: userEmail,
        enrollment: null,
        // Exclude any applications for programs the user is already enrolled in
        programId: {
          notIn: user.partners
            .map((p) => p.partner.programs.map((pp) => pp.programId))
            .flat(),
        },
      },
      include: {
        program: true,
        partnerGroup: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!programApplications.length) {
      return;
    }

    const partner = user.partners[0].partner;

    // if there are duplicate program applications
    // pick the latest one for each programId
    // note: programApplications is already sorted by createdAt desc
    const seenProgramIds = new Set<string>();
    const filteredProgramApplications = programApplications.filter(
      (programApplication) => {
        if (seenProgramIds.has(programApplication.programId)) {
          return false;
        }
        seenProgramIds.add(programApplication.programId);
        return true;
      },
    );

    // Program enrollments to create. `id` is narrowed to required because the
    // search sync below reads it back, and Prisma leaves it optional here.
    const programEnrollments: (Prisma.ProgramEnrollmentCreateManyInput & {
      id: string;
    })[] = filteredProgramApplications.map((programApplication) => ({
      id: createId({ prefix: "pge_" }),
      programId: programApplication.programId,
      partnerId: partner.id,
      applicationId: programApplication.id,
      groupId: programApplication?.partnerGroup?.id,
      clickRewardId: programApplication?.partnerGroup?.clickRewardId,
      leadRewardId: programApplication?.partnerGroup?.leadRewardId,
      saleRewardId: programApplication?.partnerGroup?.saleRewardId,
      customRewardId: programApplication?.partnerGroup?.customRewardId,
      referralRewardId: programApplication?.partnerGroup?.referralRewardId,
      discountId: programApplication?.partnerGroup?.discountId,
    }));

    const enrollmentsByApplicationId = new Map(
      programEnrollments.map((enrollment) => [
        enrollment.applicationId!,
        enrollment,
      ]),
    );

    await prisma.$transaction([
      prisma.programEnrollment.createMany({
        data: programEnrollments,
        skipDuplicates: true,
      }),

      prisma.programApplication.updateMany({
        where: {
          id: {
            in: pluck(filteredProgramApplications, "id"),
          },
          enrollment: {
            isNot: null,
          },
        },
        data: {
          partnerId: partner.id,
        },
      }),
    ]);

    // Fetch the programs' workspaces
    const workspaces = await prisma.project.findMany({
      where: {
        defaultProgramId: {
          in: filteredProgramApplications.map((p) => p.programId),
        },
      },
      select: {
        id: true,
        defaultProgramId: true,
        webhookEnabled: true,
      },
    });

    // Map workspaces by their defaultProgramId for quick lookup
    const workspacesByProgramId = new Map(
      workspaces.map((ws) => [ws.defaultProgramId, ws]),
    );

    const { platforms: backfilledPlatforms } = await backfillPartnerPlatforms({
      partnerId: partner.id,
      platforms: partner.platforms,
      applications: filteredProgramApplications,
    });

    await Promise.allSettled(
      filteredProgramApplications.map(async (programApplication) => {
        const application = programApplication;
        const program = programApplication.program;
        const group = programApplication.partnerGroup;
        const programEnrollment = enrollmentsByApplicationId.get(
          programApplication.id,
        );

        const applicationFormData = formatApplicationFormData(application).map(
          ({ title, value }) => ({
            label: title,
            value: value !== "" ? value : null,
          }),
        );

        const { valid: validApplication } = evaluateApplicationRequirements({
          applicationRequirements: program.applicationRequirements,
          context: {
            country: partner.country,
            email: partner.email,
          },
        });

        const { platforms, socialFields } = mergeApplicationSocialPlatforms({
          platforms: backfilledPlatforms,
          application,
        });

        const webhookData = {
          id: application.id,
          createdAt: application.createdAt,
          applicationFormData,
          partner: {
            ...partner,
            ...programEnrollment,
            id: partner.id,
            status: "pending",
          },
        };

        await Promise.allSettled([
          ...(validApplication
            ? [
                notifyProgramApplication({
                  partner,
                  program,
                  group,
                  application,
                }),

                // Auto-approve the partner if the group has auto-approval enabled
                group?.autoApprovePartnersEnabledAt
                  ? autoApproveProgramApplicationJob.dispatch(
                      { applicationId: application.id },
                      { label: partner.id },
                    )
                  : Promise.resolve(null),

                // Send "partner.application_submitted" webhook (deprecated)
                workspacesByProgramId.has(program.id) &&
                  sendWorkspaceWebhook({
                    workspace: workspacesByProgramId.get(program.id)!,
                    trigger: "partner.application_submitted",
                    data: partnerApplicationWebhookSchema.parse({
                      ...webhookData,
                      partner: {
                        ...webhookData.partner,
                        ...formatWebsiteAndSocialsFields(application),
                      },
                    }),
                  }),

                // Send "program_application.created" webhook
                workspacesByProgramId.has(program.id) &&
                  sendWorkspaceWebhook({
                    workspace: workspacesByProgramId.get(program.id)!,
                    trigger: "program_application.created",
                    data: programApplicationWebhookSchema.parse({
                      ...webhookData,
                      partner: {
                        ...webhookData.partner,
                        platforms,
                        ...socialFields,
                      },
                    }),
                  }),
              ]
            : [
                autoRejectProgramApplicationJob.dispatch(
                  {
                    applicationId: application.id,
                  },
                  {
                    delay: 5 * 60, // 5 minutes
                    label: partner.id,
                  },
                ),
              ]),

          // Detect and record fraud events for the partner when they apply to a program
          detectAndRecordFraudApplication({
            context: {
              program,
              partner,
            },
          }),
        ]);
      }),
    );

    await Promise.allSettled(
      programEnrollments.map((programEnrollment) =>
        markApplicationEventSubmitted(programEnrollment),
      ),
    );

    // Queue an index update because the applications completed into enrollments.
    await queuePartnerSearchSync({
      enrollmentIds: programEnrollments.map(({ id }) => id),
    });
  } catch (error) {
    console.error("Failed to complete program applications", error);
  }
}
