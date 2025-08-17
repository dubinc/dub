import { createId } from "@/lib/api/create-id";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { randomValue } from "@dub/utils";
import "dotenv-flow/config";

// one time script for migrating to partner groups
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
      status: {
        notIn: ["pending", "rejected", "banned"],
      },
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
  console.table(groups);

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

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: {
        in: groups.map((group) => group.programId),
      },
    },
    select: {
      id: true,
      programId: true,
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
    },
  });

  const duplicateRewardsToCreate: Prisma.RewardCreateManyInput[] = [];
  const duplicateDiscountsToCreate: Prisma.DiscountCreateManyInput[] = [];
  const programEnrollmentsToUpdate: {
    ids: string[];
    data: Prisma.ProgramEnrollmentUpdateManyArgs["data"];
  }[] = [];

  const rewardIdCounts = {};
  const discountIdCounts = {};
  const programIdCounts = {};

  const partnerGroupsToCreate = (await Promise.all(
    groups.map(async (group) => {
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
            group[`updated_${rewardType}`] = newRewardId;

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
          group["updated_discountId"] = newDiscountId;

          // add the duplicated discount to the list of duplicate discounts to create
          duplicateDiscountsToCreate.push({
            ...discountFieldsToDuplicate,
            id: newDiscountId,
          });
        }
      }

      const hasDefaultReward = rewards.some(
        (reward) =>
          // @ts-ignore (old reward schema)
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

      const finalGroupId = createId({ prefix: "grp_" });
      const finalClickRewardId =
        group["updated_clickRewardId"] ?? group.clickRewardId;
      const finalLeadRewardId =
        group["updated_leadRewardId"] ?? group.leadRewardId;
      const finalSaleRewardId =
        group["updated_saleRewardId"] ?? group.saleRewardId;
      const finalDiscountId = group["updated_discountId"] ?? group.discountId;

      programEnrollmentsToUpdate.push({
        ids: programEnrollments
          .filter(
            (enrollment) =>
              enrollment.programId === group.programId &&
              enrollment.clickRewardId === group.clickRewardId &&
              enrollment.leadRewardId === group.leadRewardId &&
              enrollment.saleRewardId === group.saleRewardId &&
              enrollment.discountId === group.discountId,
          )
          .map((enrollment) => enrollment.id),
        data: {
          groupId: finalGroupId,
          clickRewardId: finalClickRewardId,
          leadRewardId: finalLeadRewardId,
          saleRewardId: finalSaleRewardId,
          discountId: finalDiscountId,
        },
      });

      if (isDefaultGroup) {
        await prisma.program.update({
          where: { id: group.programId },
          data: { defaultGroupId: finalGroupId },
        });
        console.log(
          `Updated program ${group.programId} with default group ${finalGroupId}`,
        );
      }

      return {
        id: finalGroupId,
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
        clickRewardId: finalClickRewardId,
        leadRewardId: finalLeadRewardId,
        saleRewardId: finalSaleRewardId,
        discountId: finalDiscountId,
      };
    }),
  )) satisfies Prisma.PartnerGroupCreateManyInput[];

  console.log(
    `Duplicate rewards to create: ${duplicateRewardsToCreate.length}`,
  );
  console.table(duplicateRewardsToCreate);
  console.log(
    `Duplicate discounts to create: ${duplicateDiscountsToCreate.length}`,
  );
  console.table(duplicateDiscountsToCreate);
  console.log(`Partner groups to create: ${partnerGroupsToCreate.length}`);
  console.table(partnerGroupsToCreate);
  console.log(
    `Program enrollments to update: ${programEnrollmentsToUpdate.length}`,
  );
  console.table(
    programEnrollmentsToUpdate.map((pe) => ({
      ...pe,
      data: JSON.stringify(pe.data, null, 2),
    })),
  );

  const rewardsRes = await prisma.reward.createMany({
    data: duplicateRewardsToCreate,
    skipDuplicates: true,
  });
  console.log(`Created ${rewardsRes.count} duplicate rewards`);

  const discountsRes = await prisma.discount.createMany({
    data: duplicateDiscountsToCreate,
    skipDuplicates: true,
  });
  console.log(`Created ${discountsRes.count} duplicate discounts`);

  const groupsRes = await prisma.partnerGroup.createMany({
    data: partnerGroupsToCreate,
    skipDuplicates: true,
  });

  console.log(`Created ${groupsRes.count} partner groups`);

  for (const pe of programEnrollmentsToUpdate) {
    const r = await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: pe.ids,
        },
      },
      data: pe.data,
    });
    console.log(`Updated ${r.count} enrollments for group ${pe.data.groupId}`);
  }
}

main();
