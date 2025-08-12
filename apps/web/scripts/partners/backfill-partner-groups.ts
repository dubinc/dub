import { createId } from "@/lib/api/create-id";
import { RESOURCE_COLORS } from "@/lib/colors";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID, randomValue } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const groups = await prisma.programEnrollment.groupBy({
    by: [
      "programId",
      "saleRewardId",
      "leadRewardId",
      "clickRewardId",
      "discountId",
    ],
    where: {
      groupId: null,
      programId: ACME_PROGRAM_ID,
      status: "approved",
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        programId: "desc",
      },
    },
  });

  console.log(`Found total of ${groups.length} groups`);

  const rewards = await prisma.reward.findMany({
    where: {
      programId: {
        in: groups.map((group) => group.programId),
      },
    },
  });

  const discounts = await prisma.discount.findMany({
    where: {
      programId: {
        in: groups.map((group) => group.programId),
      },
    },
  });

  const duplicateRewardsToCreate: Prisma.RewardCreateManyInput[] = [];
  const duplicateDiscountsToCreate: Prisma.DiscountCreateManyInput[] = [];

  const rewardIdCounts = {};
  const discountIdCounts = {};
  const programIdCounts = {};

  const partnerGroupsToCreate = groups.map((group) => {
    for (const rewardType of [
      "saleRewardId",
      "leadRewardId",
      "clickRewardId",
    ]) {
      if (group[rewardType]) {
        if (rewardIdCounts[group[rewardType]] === undefined) {
          rewardIdCounts[group[rewardType]] = 0;
        }
        rewardIdCounts[group[rewardType]]++;

        // if the rewardId was already seen before, we need to duplicate it to prevent unique constraint errors
        if (rewardIdCounts[group[rewardType]] > 1) {
          const { id, createdAt, updatedAt, ...rewardFieldsToDuplicate } =
            rewards.find((r) => r.id === group[rewardType])!;

          // create a new reward id to duplicate the reward
          const newRewardId = createId({ prefix: "rw_" });

          // reassign the new reward id to the group
          group[rewardType] = newRewardId;

          // add the duplicated reward to the list of duplicate rewards to create
          duplicateRewardsToCreate.push({
            ...rewardFieldsToDuplicate,
            id: newRewardId,
            modifiers: rewardFieldsToDuplicate.modifiers
              ? JSON.parse(JSON.stringify(rewardFieldsToDuplicate.modifiers))
              : null,
          });
        }
      }
    }

    if (group.discountId) {
      if (discountIdCounts[group.discountId] === undefined) {
        discountIdCounts[group.discountId] = 0;
      }
      discountIdCounts[group.discountId]++;

      // if the discountId was already seen before, we need to duplicate it to prevent unique constraint errors
      if (discountIdCounts[group.discountId] > 1) {
        const { id, createdAt, updatedAt, ...discountFieldsToDuplicate } =
          discounts.find((d) => d.id === group.discountId)!;

        // create a new discount id to duplicate the discount
        const newDiscountId = createId({ prefix: "disc_" });

        // reassign the new discount id to the group
        group.discountId = newDiscountId;

        // add the duplicated discount to the list of duplicate discounts to create
        duplicateDiscountsToCreate.push({
          ...discountFieldsToDuplicate,
          id: newDiscountId,
        });
      }
    }

    const hasDefaultReward = rewards.some(
      (reward) =>
        reward.default &&
        (reward.id === group.saleRewardId ||
          reward.id === group.leadRewardId ||
          reward.id === group.clickRewardId),
    );

    if (programIdCounts[group.programId] === undefined) {
      programIdCounts[group.programId] = 0;
    }
    programIdCounts[group.programId]++;

    const isDefaultGroup =
      hasDefaultReward && programIdCounts[group.programId] === 1;

    return {
      id: createId({ prefix: "grp_" }),
      programId: group.programId,
      name: isDefaultGroup
        ? DEFAULT_PARTNER_GROUP.name
        : `Group ${programIdCounts[group.programId]}`,
      slug: isDefaultGroup
        ? DEFAULT_PARTNER_GROUP.slug
        : `group-${programIdCounts[group.programId]}`,
      color: isDefaultGroup
        ? DEFAULT_PARTNER_GROUP.color
        : randomValue(RESOURCE_COLORS),
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    };
  }) satisfies Prisma.PartnerGroupCreateManyInput[];

  console.log(`Partner groups to create: ${partnerGroupsToCreate.length}`);
  console.table(partnerGroupsToCreate);
  console.log(
    `Duplicate rewards to create: ${duplicateRewardsToCreate.length}`,
  );
  console.table(duplicateRewardsToCreate);
  console.log(
    `Duplicate discounts to create: ${duplicateDiscountsToCreate.length}`,
  );
  console.table(duplicateDiscountsToCreate);

  // const res = await prisma.partnerGroup.createMany({
  //   data: partnerGroupsToCreate,
  // });

  // console.log(`Created ${res.count} partner groups`);

  // for (const group of partnerGroupsToCreate) {
  //   const r = await prisma.programEnrollment.updateMany({
  //     where: {
  //       groupId: null,
  //       programId: group.programId,
  //       clickRewardId: group.clickRewardId,
  //       leadRewardId: group.leadRewardId,
  //       saleRewardId: group.saleRewardId,
  //       discountId: group.discountId,
  //     },
  //     data: { groupId: group.id },
  //   });
  //   console.log(`Updated ${r.count} enrollments for group ${group.id}`);
  // }
}

main();
