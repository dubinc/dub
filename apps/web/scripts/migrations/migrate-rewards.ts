// @ts-nocheck – this is a one-time migration script for
// when we migrate the rewards table to the new schema

import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

/* 
One time script to migrate the rewards table to the new schema.

1. Migrate program-wide rewards
2. Migrate partner-specific rewards

*/

async function main() {
  // Migrate program-wide rewards
  const programRewards = await prisma.reward.findMany({
    where: {
      partners: {
        none: {},
      },
    },
    select: {
      id: true,
      event: true,
      programId: true,
    },
  });

  const finalProgramRewards = programRewards.map((reward) => {
    return {
      rewardId: reward.id,
      rewardEvent: reward.event,
      programId: reward.programId,
    };
  });

  console.table(finalProgramRewards);

  // Update the default column in the Reward table
  const res1 = await prisma.reward.updateMany({
    where: {
      id: {
        in: finalProgramRewards.map((reward) => reward.rewardId),
      },
    },
    data: {
      default: true,
    },
  });

  console.log({ res1 });

  for (const reward of finalProgramRewards) {
    const rewardEvent = reward.rewardEvent;

    const res2 = await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
      },
      data: {
        [REWARD_EVENT_COLUMN_MAPPING[rewardEvent]]: reward.rewardId,
      },
    });

    console.log({ res2 });
  }

  // Migrate partner-specific rewards
  const partnerRewards = await prisma.partnerReward.findMany({
    include: {
      reward: true,
    },
  });

  const finalPartnerRewards = partnerRewards.map((reward) => {
    return {
      rewardId: reward.reward.id,
      rewardEvent: reward.reward.event,
      programEnrollmentId: reward.programEnrollmentId,
    };
  });

  console.table(finalPartnerRewards);

  for (const reward of finalPartnerRewards) {
    const rewardEvent = reward.rewardEvent;

    const res3 = await prisma.programEnrollment.update({
      where: {
        id: reward.programEnrollmentId,
      },
      data: {
        [REWARD_EVENT_COLUMN_MAPPING[rewardEvent]]: reward.rewardId,
      },
    });

    console.log({ res3 });
  }
}

main();
