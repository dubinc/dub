import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "../prisma";

// Hard-delete LinkReward rows with no remaining reward/discount relations.
// Loads relations (not just FK null checks) so dangling IDs after a hard-delete
// are treated as empty too — update-partner-link nulls overrides, and discount
// deletes SetNull / may leave a stale discountId until this cron runs.
export async function deleteEmptyLinkRewards() {
  let deletedCount = 0;
  let startAfterId: string | undefined;

  while (true) {
    const batch = await prisma.linkReward.findMany({
      select: {
        id: true,
        clickReward: {
          select: {
            id: true,
          },
        },
        leadReward: {
          select: {
            id: true,
          },
        },
        saleReward: {
          select: {
            id: true,
          },
        },
        discount: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take: PRISMA_UPDATEMANY_LIMIT,
      ...(startAfterId && {
        skip: 1,
        cursor: {
          id: startAfterId,
        },
      }),
    });

    if (batch.length === 0) {
      break;
    }

    startAfterId = batch[batch.length - 1].id;

    const emptyIds = batch
      .filter(
        (linkReward) =>
          !linkReward.clickReward &&
          !linkReward.leadReward &&
          !linkReward.saleReward &&
          !linkReward.discount,
      )
      .map((linkReward) => linkReward.id);

    if (emptyIds.length > 0) {
      const { count } = await prisma.linkReward.deleteMany({
        where: {
          id: {
            in: emptyIds,
          },
        },
      });

      deletedCount += count;
    }

    if (batch.length < PRISMA_UPDATEMANY_LIMIT) {
      break;
    }
  }

  return deletedCount;
}
