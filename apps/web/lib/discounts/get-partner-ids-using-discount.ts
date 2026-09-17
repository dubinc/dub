import { prisma } from "@/lib/prisma";

export async function getPartnerIdsUsingDiscount({
  discountIds,
}: {
  discountIds: string[];
}) {
  if (discountIds.length === 0) {
    return [];
  }

  const [enrollments, linkRewards] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        partnerId: true,
      },
    }),

    prisma.linkReward.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        link: {
          select: {
            partnerId: true,
          },
        },
      },
    }),
  ]);

  return [
    ...new Set([
      ...enrollments.map((enrollment) => enrollment.partnerId),
      ...linkRewards.flatMap((linkReward) =>
        linkReward.link.partnerId ? [linkReward.link.partnerId] : [],
      ),
    ]),
  ];
}
