import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { prisma } from "@dub/prisma";
import { Prisma, Reward } from "@dub/prisma/client";
import { DubApiError } from "../errors";

export async function getProgramEnrollmentOrThrow({
  partnerId,
  programId,
  includeRewards = false,
}: {
  partnerId: string;
  programId: string;
  includeRewards?: boolean;
}) {
  const include: Prisma.ProgramEnrollmentInclude = {
    program: true,
    links: {
      orderBy: {
        createdAt: "asc",
      },
    },
    ...(includeRewards && {
      clickReward: true,
      leadReward: true,
      saleReward: true,
    }),
  };

  const programEnrollment = programId.startsWith("prog_")
    ? await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include,
      })
    : await prisma.programEnrollment.findFirst({
        where: {
          partnerId,
          program: {
            slug: programId,
          },
        },
        include,
      });

  if (!programEnrollment || !programEnrollment.program) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You are not enrolled in this program. Contact your program admin to get enrolled.",
    });
  }

  const { links } = programEnrollment;

  if (!links) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You don't have a link for this program yet. Contact your program admin to get one.",
    });
  }

  return {
    ...programEnrollment,
    ...(includeRewards && {
      rewards: sortRewardsByEventOrder(
        [
          programEnrollment.clickReward,
          programEnrollment.leadReward,
          programEnrollment.saleReward,
        ].filter((r): r is Reward => r !== null),
      ),
    }),
    links,
  };
}
