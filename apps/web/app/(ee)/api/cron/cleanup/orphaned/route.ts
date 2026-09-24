import { deleteOrphanedDefaultLinks } from "@/lib/api/groups/delete-orphaned-default-links";
import { withCron } from "@/lib/cron/with-cron";
import { deleteOrphanedDiscounts } from "@/lib/discounts/delete-orphaned-discounts";
import { deleteEmptyLinkRewards } from "@/lib/rewards/delete-empty-link-rewards";
import { deleteOrphanedRewards } from "@/lib/rewards/delete-orphaned-rewards";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const STALE_AFTER_MINUTES = 60; // 1 hour

// Hard-deletes leftover rows after request-path soft-deletes / unassigns:
// - Rewards: rewards/process clears enrollments on delete; this cron hard-deletes
//   once nothing still references the soft-deleted reward (programId null).
// - Discounts: detach-discount remaps codes first; this cron hard-deletes once
//   nothing still references the soft-deleted discount (programId null).
// - LinkReward: update-partner-link nulls override IDs instead of deleting the row.
//   Discount deletes SetNull LinkReward.discountId the same way.
// - PartnerGroupDefaultLink: group delete soft-deletes (groupId null) so in-flight
//   remap keeps partnerGroupDefaultLinkId; this cron hard-deletes once no links
//   still reference the row.

// POST /api/cron/cleanup/orphaned
export const POST = withCron(async () => {
  const cutoff = subMinutes(new Date(), STALE_AFTER_MINUTES);

  const [
    deletedRewardsCount,
    deletedDiscountsCount,
    deletedLinkRewardsCount,
    deletedDefaultLinksCount,
  ] = await Promise.all([
    deleteOrphanedRewards(cutoff),
    deleteOrphanedDiscounts(cutoff),
    deleteEmptyLinkRewards(),
    deleteOrphanedDefaultLinks(cutoff),
  ]);

  console.log({
    deletedRewardsCount,
    deletedDiscountsCount,
    deletedLinkRewardsCount,
    deletedDefaultLinksCount,
  });

  return logAndRespond("OK");
});
