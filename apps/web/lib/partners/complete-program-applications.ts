import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Partner, Prisma, ProgramApplication } from "@prisma/client";
import { createId } from "../api/create-id";
import { notifyPartnerApplication } from "../api/partners/notify-partner-application";
import { qstash } from "../cron";

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

    for (const programApplication of filteredProgramApplications) {
      const partner = user.partners[0].partner;
      const program = programApplication.program;
      const application = programApplication;

      const missingSocialFields = {
        website: application.website && !partner.website ? application.website : undefined,
        youtube: application.youtube && !partner.youtube ? application.youtube : undefined,
        twitter: application.twitter && !partner.twitter ? application.twitter : undefined,
        linkedin: application.linkedin && !partner.linkedin ? application.linkedin : undefined,
        instagram: application.instagram && !partner.instagram ? application.instagram : undefined,
        tiktok: application.tiktok && !partner.tiktok ? application.tiktok : undefined,
      }

      const hasMissingSocialFields = Object.values(missingSocialFields).some((field) => field !== undefined);

      await Promise.allSettled([
        notifyPartnerApplication({
          partner,
          program,
          application,
        }),

        // if the application has any website or social fields but the partner doesn't have the corresponding one (maybe they forgot to add during onboarding)
        // update the partner to use the website they applied with
        hasMissingSocialFields &&
          prisma.partner.update({
            where: { id: partner.id },
            data: missingSocialFields,
          }),

        // Auto-approve the partner
        program.autoApprovePartnersEnabledAt
          ? qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/auto-approve-partner`,
              delay: 5 * 60,
              body: {
                programId: program.id,
                partnerId: partner.id,
              },
            })
          : Promise.resolve(null),
      ]);
    }
  } catch (error) {
    console.error("Failed to complete program applications", error);
  }
}
