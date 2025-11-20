import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { notifyPartnerApplication } from "../api/partners/notify-partner-application";
import { qstash } from "../cron";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { partnerApplicationWebhookSchema } from "../zod/schemas/program-application";
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
      where: { email: userEmail },
      select: {
        partners: {
          select: {
            partnerId: true,
            partner: {
              include: {
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

    // Program enrollments to create
    const programEnrollments: Prisma.ProgramEnrollmentCreateManyInput[] =
      filteredProgramApplications.map((programApplication) => ({
        id: createId({ prefix: "pge_" }),
        programId: programApplication.programId,
        partnerId: user.partners[0].partnerId,
        applicationId: programApplication.id,
        groupId: programApplication?.partnerGroup?.id,
        clickRewardId: programApplication?.partnerGroup?.clickRewardId,
        leadRewardId: programApplication?.partnerGroup?.leadRewardId,
        saleRewardId: programApplication?.partnerGroup?.saleRewardId,
        discountId: programApplication?.partnerGroup?.discountId,
      }));

    await prisma.programEnrollment.createMany({
      data: programEnrollments,
      skipDuplicates: true,
    });

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
      const partner = user.partners[0].partner;
      const application = programApplication;
      const program = programApplication.program;
      const group = programApplication.partnerGroup;
      const programEnrollment = partner.programs.find(
        (p) => p.programId === programApplication.programId,
      );

      const missingSocialFields = {
        website:
          application.website && !partner.website
            ? application.website
            : undefined,
        youtube:
          application.youtube && !partner.youtube
            ? application.youtube
            : undefined,
        twitter:
          application.twitter && !partner.twitter
            ? application.twitter
            : undefined,
        linkedin:
          application.linkedin && !partner.linkedin
            ? application.linkedin
            : undefined,
        instagram:
          application.instagram && !partner.instagram
            ? application.instagram
            : undefined,
        tiktok:
          application.tiktok && !partner.tiktok
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

      await Promise.allSettled([
        notifyPartnerApplication({
          partner,
          program,
          group,
          application,
        }),

        // if the application has any website or social fields but the partner doesn't have the corresponding one (maybe they forgot to add during onboarding)
        // update the partner to use the website they applied with
        hasMissingSocialFields &&
          prisma.partner.update({
            where: { id: partner.id },
            data: missingSocialFields,
          }),

        // Auto-approve the partner if the group has auto-approval enabled
        group?.autoApprovePartnersEnabledAt
          ? qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/auto-approve-partner`,
              delay: 5 * 60,
              body: {
                programId: program.id,
                partnerId: partner.id,
              },
            })
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
                status: "pending",
                ...formatWebsiteAndSocialsFields(application),
              },
              applicationFormData,
            }),
          }),
      ]);
    }
  } catch (error) {
    console.error("Failed to complete program applications", error);
  }
}
