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

  // Find the rewards for the program enrollment
  let rewards: Reward[] = [];

  if (includeRewards) {
    const partnerRewardIds = [
      programEnrollment.clickRewardId,
      programEnrollment.leadRewardId,
      programEnrollment.saleRewardId,
    ].filter((id): id is string => id !== null);

    rewards = await prisma.reward.findMany({
      where: {
        id: {
          in: partnerRewardIds,
        },
      },
    });
  }

  return {
    ...programEnrollment,
    ...(includeRewards && { rewards }),
    links,
  };
}
