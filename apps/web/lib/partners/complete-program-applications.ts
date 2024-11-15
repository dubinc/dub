import { ProgramApplicationStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { createId } from "../api/utils";
import { prisma } from "../prisma";
import { ratelimit } from "../upstash";

/**
 * Completes any outstanding program applications for a user
 * by creating a program enrollment for each
 */
export async function completeProgramApplications(userId: string) {
  try {
    const cookieStore = await cookies();
    const programApplicationIds = cookieStore
      .get("programApplicationIds")
      ?.value?.split(",");
    if (!programApplicationIds?.length) return;

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
              select: {
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

    if (!user.partners.length) return;

    let programApplications = await prisma.programApplication.findMany({
      where: {
        id: { in: programApplicationIds.filter(Boolean) },

        // Exclude any applications for programs the user is already enrolled in
        programId: {
          notIn: user.partners
            .map((p) => p.partner.programs.map((pp) => pp.programId))
            .flat(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!programApplications.length) return;

    // Filter out duplicate program applications
    let seenIds = new Set<string>();
    programApplications = programApplications.filter(({ programId }) => {
      if (seenIds.has(programId)) return false;
      seenIds.add(programId);
      return true;
    });

    console.log("Completing program applications", {
      userId,
      partnerId: user.partners[0].partnerId,
      ids: programApplications.map(({ id }) => id),
    });

    await prisma.programEnrollment.createMany({
      data: programApplications.map((programApplication) => ({
        id: createId({ prefix: "pge_" }),
        programId: programApplication.programId,
        partnerId: user.partners[0].partnerId,
        applicationId: programApplication.id,
        status: ProgramApplicationStatus.pending,
      })),
    });

    cookieStore.delete("programApplicationIds");
  } catch (error) {
    console.error(
      "Failed to complete program applications from cookies",
      error,
    );
  }
}
