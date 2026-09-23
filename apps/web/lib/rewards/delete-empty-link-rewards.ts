import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "../prisma";

// Hard-delete LinkReward rows whose override IDs were all cleared.
// update-partner-link nulls those IDs instead of deleting the row, and
// discount deletes SetNull LinkReward.discountId the same way.
export async function deleteEmptyLinkRewards() {
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
