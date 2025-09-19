import { BountySubmissionsQueryFilters } from "@/lib/types";
import { BOUNTY_SUBMISSIONS_SORT_BY_COLUMNS } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";

interface GetBountySubmissionsParams extends BountySubmissionsQueryFilters {
  bountyId: string;
}

const SORT_COLUMNS_MAP: Record<
  (typeof BOUNTY_SUBMISSIONS_SORT_BY_COLUMNS)[number],
  string
> = {
  createdAt: "createdAt",
  commissions: "count",
  leads: "count",
  conversions: "count",
  saleAmount: "count",
};

// Get list of submissions for a given bounty
export async function getBountySubmissions({
  bountyId,
  groupId,
  sortOrder,
  sortBy,
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
      [SORT_COLUMNS_MAP[sortBy]]: sortOrder,
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
