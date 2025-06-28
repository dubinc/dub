import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { createId } from "../api/create-id";
import { notifyPartnerApplication } from "../api/partners/notify-partner-application";
import { qstash } from "../cron";
import { ratelimit } from "../upstash";

/**
 * Completes any outstanding program applications for a user
 * by creating a program enrollment for each
 */
export async function completeProgramApplications(userId: string) {
  try {
    const cookieStore = cookies();
    const programApplicationIds = cookieStore
      .get("programApplicationIds")
      ?.value?.split(",");

    if (!programApplicationIds?.length) {
      return;
    }

    // Prevent brute forcing
    const { success } = await ratelimit(3, "1 m").limit(
      `complete-program-applications:${userId}`,
    );

    if (!success) {
      console.warn("Not completing program applications due to rate limiting", {
        userId,
      });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
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

    let programApplications = await prisma.programApplication.findMany({
      where: {
        id: {
          in: programApplicationIds.filter(Boolean),
        },
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!programApplications.length) {
      return;
    }

    // Filter out duplicate program applications
    let seenIds = new Set<string>();
    programApplications = programApplications.filter(({ programId }) => {
      if (seenIds.has(programId)) return false;
      seenIds.add(programId);
      return true;
    });

    await prisma.programEnrollment.createMany({
      data: programApplications.map((programApplication) => ({
        id: createId({ prefix: "pge_" }),
        programId: programApplication.programId,
        partnerId: user.partners[0].partnerId,
        applicationId: programApplication.id,
      })),
      skipDuplicates: true,
    });

    for (const programApplication of programApplications) {
      const partner = user.partners[0].partner;
      const program = programApplication.program;
      const application = programApplication;

      await Promise.allSettled([
        notifyPartnerApplication({
          partner,
          program,
          application,
        }),

        // if the application has a website but the partner doesn't have a website (maybe they forgot to add during onboarding)
        // update the partner to use the website they applied with
        application.website &&
          !partner.website &&
          prisma.partner.update({
            where: { id: partner.id },
            data: { website: application.website },
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

    cookieStore.delete("programApplicationIds");
  } catch (error) {
    console.error(
      "Failed to complete program applications from cookies",
      error,
    );
  }
}
