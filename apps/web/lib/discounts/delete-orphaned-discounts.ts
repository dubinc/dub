import { pluck } from "@dub/utils";
import { prisma } from "../prisma";

// Hard-delete soft-deleted discounts (programId null) once nothing still
// references them. Detach workflow remaps codes first; this cron finishes
// cleanup after the stale cutoff so equivalence checks can still see the row.
export async function deleteOrphanedDiscounts(cutoff: Date) {
  const discounts = await prisma.discount.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: cutoff,
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  if (discounts.length === 0) {
    return 0;
  }

  const discountIds = pluck(discounts, "id");

  const [enrollments, groups, linkRewards, discountCodes] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        discountId: true,
      },
    }),

    prisma.partnerGroup.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        discountId: true,
      },
    }),

    prisma.linkReward.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        discountId: true,
      },
    }),

    prisma.discountCode.findMany({
      where: {
        discountId: {
          in: discountIds,
        },
      },
      select: {
        discountId: true,
      },
    }),
  ]);

  const referencedDiscountIds = new Set<string>();

  for (const row of [
    ...enrollments,
    ...groups,
    ...linkRewards,
    ...discountCodes,
  ]) {
    if (row.discountId) {
      referencedDiscountIds.add(row.discountId);
    }
  }

  const discountIdsToHardDelete = discountIds.filter(
    (id) => !referencedDiscountIds.has(id),
  );

  if (discountIdsToHardDelete.length === 0) {
    return 0;
  }

  const { count } = await prisma.discount.deleteMany({
    where: {
      id: {
        in: discountIdsToHardDelete,
      },
    },
  });

  return count;
}
