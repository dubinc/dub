import { prisma } from "@/lib/prisma";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { ProgramEnrollment } from "@prisma/client";

// Find enrollments with a qualifying clicked link and either an enrollment
// click reward or a link-level click reward.
export async function getClickRewardEnrollments({
  startDate,
  startingAfterId,
  take,
}: {
  startDate: Date;
  startingAfterId?: string;
  take: number;
}): Promise<Pick<ProgramEnrollment, "id" | "partnerId" | "programId">[]> {
  return prisma.programEnrollment.findMany({
    where: {
      ...(startingAfterId && {
        id: {
          gt: startingAfterId,
        },
      }),
      status: {
        in: COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES,
      },
      OR: [
        {
          clickRewardId: { not: null },
          links: {
            some: {
              clicks: { gt: 0 },
              lastClicked: { gte: startDate },
            },
          },
        },
        {
          links: {
            some: {
              clicks: { gt: 0 },
              lastClicked: { gte: startDate },
              linkReward: {
                clickRewardId: { not: null },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      partnerId: true,
      programId: true,
    },
    orderBy: {
      id: "asc",
    },
    take,
  });
}
