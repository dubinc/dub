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
      programEnrollments: { none: {} },
      defaultForPartnerGroup: { is: null },
      linkDiscounts: { none: {} },
      discountCodes: { none: {} },
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

  const { count } = await prisma.discount.deleteMany({
    where: {
      id: {
        in: pluck(discounts, "id"),
      },
    },
  });

  return count;
}
