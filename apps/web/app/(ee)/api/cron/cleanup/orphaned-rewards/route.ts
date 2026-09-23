import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { deleteOrphanedDiscounts } from "@/lib/discounts/delete-orphaned-discounts";
import { prisma } from "@/lib/prisma";
import { deleteOrphanedRewards } from "@/lib/rewards/delete-orphaned-rewards";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const STALE_AFTER_MINUTES = 30;

// Hard-deletes leftover rows after request-path soft-deletes / unassigns:
// - Rewards: rewards/process clears enrollments on delete; this cron hard-deletes
//   once nothing still references the soft-deleted reward (programId null).
// - Discounts: detach-discount remaps codes first; this cron hard-deletes once
//   nothing still references the soft-deleted discount (programId null).
// - LinkReward: update-partner-link nulls override IDs instead of deleting the row.
//   Discount deletes SetNull LinkReward.discountId the same way.

// POST /api/cron/cleanup/orphaned-rewards
export const POST = withCron(async () => {
  const cutoff = subMinutes(new Date(), STALE_AFTER_MINUTES);

  const [deletedRewardsCount, deletedDiscountsCount, deletedLinkRewardsCount] =
    await Promise.all([
      deleteOrphanedRewards(cutoff),
      deleteOrphanedDiscounts(cutoff),
      deleteEmptyLinkRewards(),
    ]);

  if (
    deletedRewardsCount === 0 &&
    deletedDiscountsCount === 0 &&
    deletedLinkRewardsCount === 0
  ) {
    return logAndRespond(
      "No orphaned rewards, discounts, or empty link rewards found.",
    );
  }

  return logAndRespond(
    `Finished cleanup (${deletedRewardsCount} rewards, ${deletedDiscountsCount} discounts, ${deletedLinkRewardsCount} empty link rewards deleted).`,
  );
});

async function deleteEmptyLinkRewards() {
  let deletedCount = 0;

  while (true) {
    const { count } = await prisma.linkReward.deleteMany({
      where: {
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
      limit: PRISMA_UPDATEMANY_LIMIT,
    });

    if (count === 0) {
      break;
    }

    deletedCount += count;
  }

  return deletedCount;
}
