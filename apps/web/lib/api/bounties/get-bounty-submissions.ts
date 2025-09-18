import { BountySubmissionsQueryFilters } from "@/lib/types";
import { prisma } from "@dub/prisma";

interface GetBountySubmissionsParams extends BountySubmissionsQueryFilters {
  bountyId: string;
}

// Get list of submissions for a given bounty
export async function getBountySubmissions({
  bountyId,
  groupId,
  sortOrder,
  page,
  pageSize,
  status,
}: GetBountySubmissionsParams) {
  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId,
      ...(status ? { status } : { status: { not: "rejected" } }),
      ...(groupId && {
        programEnrollment: {
          groupId,
        },
      }),
    },
    include: {
      user: true,
      commission: true,
      partner: true,
      programEnrollment: true,
    },
    orderBy: {
      createdAt: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return submissions.map(
    ({ partner, programEnrollment, commission, user, ...submission }) => {
      return {
        ...submission,
        partner: {
          ...partner,
          ...programEnrollment,
          id: partner.id,
          status: programEnrollment?.status,
        },
        commission,
        user,
      };
    },
  );
}
