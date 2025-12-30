import { prisma } from "@dub/prisma";
import { deepEqual } from "@dub/utils";
import "dotenv-flow/config";

// verify that the rewards and discount are the same for all enrollments in a group
async function main() {
  const groups = await prisma.programEnrollment.groupBy({
    by: [
      "programId",
      "groupId",
      "saleRewardId",
      "leadRewardId",
      "clickRewardId",
      "discountId",
    ],
    where: {
      status: {
        notIn: ["pending", "rejected", "banned"],
      },
    },
  });

  for (const group of groups) {
    if (!group.groupId) {
      console.log(`Some enrollments in ${group.programId} have no group id`);
      continue;
    }

    const groupData = await prisma.partnerGroup.findUnique({
      where: {
        id: group.groupId,
      },
    });

    if (!groupData) {
      console.log(`Group ${group.groupId} not found`);
      continue;
    }

    if (
      !deepEqual(
        {
          saleRewardId: groupData.saleRewardId,
          leadRewardId: groupData.leadRewardId,
          clickRewardId: groupData.clickRewardId,
          discountId: groupData.discountId,
        },
        {
          saleRewardId: group.saleRewardId,
          leadRewardId: group.leadRewardId,
          clickRewardId: group.clickRewardId,
          discountId: group.discountId,
        },
      )
    ) {
      console.log(`Group ${group.groupId} has different rewards`);
      continue;
    }

    console.log(`Group ${group.groupId} is valid`);
  }
}

main();
