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

  const defaultRewards = await prisma.reward.findMany({
    where: {
      programId: {
        in: groups.map((group) => group.programId),
      },
      default: true,
    },
  });

  const programIdCounts = {};

  const partnerGroupsToCreate = groups.map((group) => {
    const hasDefaultReward = defaultRewards.some(
      (reward) =>
        reward.id === group.saleRewardId ||
        reward.id === group.leadRewardId ||
        reward.id === group.clickRewardId,
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

  console.table(partnerGroupsToCreate);

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
