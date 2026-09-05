import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { detectAndRecordFraudApplication } from "../api/fraud/detect-record-fraud-application";
import { notifyPartnerApplication } from "../api/partners/notify-partner-application";
import { queuePartnerSearchSync } from "../api/partners/queue-partner-search-sync";
import { markApplicationEventSubmitted } from "../application-events/update-application-event";
import { autoApprovePartnerJob } from "../jobs/handlers/auto-approve-partner-job";
import { autoRejectPartnerJob } from "../jobs/handlers/auto-reject-partner-job";
import { buildSocialPlatformLookup } from "../social-utils";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { partnerApplicationWebhookSchema } from "../zod/schemas/program-application";
import {
  evaluateApplicationRequirements,
  getEligibilityContext,
} from "./evaluate-application-requirements";
import {
  formatApplicationFormData,
  formatWebsiteAndSocialsFields,
} from "./format-application-form-data";
import {
  getScreeningApplicationData,
  notifyScreeningRejection,
  ScreeningResult,
  screenProgramApplication,
} from "./screen-program-application";

/**
 * Completes any outstanding program applications for a user
 * by creating a program enrollment for each
 */
export async function completeProgramApplications(userEmail: string) {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: userEmail },
      select: {
        partners: {
          select: {
            partnerId: true,
            partner: {
              include: {
                platforms: true,
                preferredEarningStructures: true,
                salesChannels: true,
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

    const partner = user.partners[0].partner;

    const eligibilityContext = getEligibilityContext({
      partner,
      programEnrollmentStatuses: partner.programs.map(({ status }) => status),
    });

    const validApplicationIds = new Set(
      filteredProgramApplications
        .filter(
          ({ program }) =>
            evaluateApplicationRequirements({
              applicationRequirements: program.applicationRequirements,
              context: eligibilityContext,
            }).valid,
        )
        .map(({ id }) => id),
    );

    // Screen eligible applications before their enrollments exist, so a
    // screened-out application never shows up as pending
    const screeningResults = new Map<string, ScreeningResult>();

    for (const programApplication of filteredProgramApplications) {
      if (!validApplicationIds.has(programApplication.id)) {
        continue;
      }

      const screening = await screenProgramApplication({
        program: programApplication.program,
        partner,
        application: programApplication,
      });

      if (screening) {
        screeningResults.set(programApplication.id, screening);
      }
    }

    const isScreenedOut = (applicationId: string) =>
      screeningResults.get(applicationId)?.decision === "reject";

    // Program enrollments to create. `id` is narrowed to required because the
    // search sync below reads it back, and Prisma leaves it optional here.
    const programEnrollments: (Prisma.ProgramEnrollmentCreateManyInput & {
      id: string;
    })[] = filteredProgramApplications.map((programApplication) =>
      isScreenedOut(programApplication.id)
        ? {
            id: createId({ prefix: "pge_" }),
            programId: programApplication.programId,
            partnerId: user.partners[0].partnerId,
            applicationId: programApplication.id,
            groupId: programApplication?.partnerGroup?.id,
            // Screened-out partners are rejected for good and cannot reapply
            status: "rejected",
            reapplicationTimeframe: "never",
          }
        : {
            id: createId({ prefix: "pge_" }),
            programId: programApplication.programId,
            partnerId: user.partners[0].partnerId,
            applicationId: programApplication.id,
            groupId: programApplication?.partnerGroup?.id,
            clickRewardId: programApplication?.partnerGroup?.clickRewardId,
            leadRewardId: programApplication?.partnerGroup?.leadRewardId,
            saleRewardId: programApplication?.partnerGroup?.saleRewardId,
            discountId: programApplication?.partnerGroup?.discountId,
          },
    );

    const enrollmentsByApplicationId = new Map(
      programEnrollments.map((enrollment) => [
        enrollment.applicationId!,
        enrollment,
      ]),
    );

    await prisma.programEnrollment.createMany({
      data: programEnrollments,
      skipDuplicates: true,
    });

    // Record the screening outcome (pass or reject) on each screened application
    await Promise.allSettled(
      [...screeningResults].map(([applicationId, screening]) =>
        prisma.programApplication.update({
          where: { id: applicationId },
          data: getScreeningApplicationData(screening),
        }),
      ),
    );

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

    for (const programApplication of filteredProgramApplications) {
      const application = programApplication;
      const program = programApplication.program;
      const group = programApplication.partnerGroup;
      const programEnrollment = enrollmentsByApplicationId.get(
        programApplication.id,
      );

      const socialPlatforms = buildSocialPlatformLookup(partner.platforms);

      const missingSocialFields = {
        website:
          application.website && !socialPlatforms.website?.identifier
            ? application.website
            : undefined,
        youtube:
          application.youtube && !socialPlatforms.youtube?.identifier
            ? application.youtube
            : undefined,
        twitter:
          application.twitter && !socialPlatforms.twitter?.identifier
            ? application.twitter
            : undefined,
        linkedin:
          application.linkedin && !socialPlatforms.linkedin?.identifier
            ? application.linkedin
            : undefined,
        instagram:
          application.instagram && !socialPlatforms.instagram?.identifier
            ? application.instagram
            : undefined,
        tiktok:
          application.tiktok && !socialPlatforms.tiktok?.identifier
            ? application.tiktok
            : undefined,
      };

      const hasMissingSocialFields = Object.values(missingSocialFields).some(
        (field) => field !== undefined,
      );

      const applicationFormData = formatApplicationFormData(application).map(
        ({ title, value }) => ({
          label: title,
          value: value !== "" ? value : null,
        }),
      );

      const validApplication = validApplicationIds.has(application.id);
      const screenedOut = isScreenedOut(application.id);

      await Promise.allSettled([
        ...(validApplication
          ? [
              screenedOut
                ? notifyScreeningRejection({ program, partner })
                : notifyPartnerApplication({
                    partner,
                    program,
                    group,
                    application,
                  }),

              // Auto-approve the partner if the group has auto-approval enabled
              group?.autoApprovePartnersEnabledAt && !screenedOut
                ? autoApprovePartnerJob.dispatch(
                    {
                      programId: program.id,
                      partnerId: partner.id,
                    },
                    {
                      label: partner.id,
                    },
                  )
                : Promise.resolve(null),

              // Send "partner.application_submitted" webhook
              workspacesByProgramId.has(program.id) &&
                sendWorkspaceWebhook({
                  workspace: workspacesByProgramId.get(program.id)!,
                  trigger: "partner.application_submitted",
                  data: partnerApplicationWebhookSchema.parse({
                    id: application.id,
                    createdAt: application.createdAt,
                    partner: {
                      ...partner,
                      ...programEnrollment,
                      id: partner.id,
                      status: screenedOut ? "rejected" : "pending",
                      ...formatWebsiteAndSocialsFields(application),
                    },
                    applicationFormData,
                  }),
                }),
            ]
          : [
              autoRejectPartnerJob.dispatch(
                {
                  programId: program.id,
                  partnerId: partner.id,
                },
                {
                  delay: 5 * 60, // 5 minutes
                  label: partner.id,
                },
              ),
            ]),

        // if the application has any website or social fields but the partner doesn't have the corresponding one (maybe they forgot to add during onboarding)
        // update the partner to use the website they applied with
        hasMissingSocialFields &&
          prisma.partnerPlatform.createMany({
            data: Object.entries(missingSocialFields)
              .filter(([, identifier]) => identifier !== undefined)
              .map(([platform, identifier]) => ({
                partnerId: partner.id,
                type: platform as PlatformType,
                identifier: identifier as string,
              })),
            skipDuplicates: true,
          }),

        // Detect and record fraud events for the partner when they apply to a program
        detectAndRecordFraudApplication({
          context: {
            program,
            partner,
          },
        }),
      ]);
    }

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
