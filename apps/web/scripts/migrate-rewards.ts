import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const EVENT_TYPE_TO_COLUMN = {
  click: "clickRewardId",
  lead: "leadRewardId",
  sale: "saleRewardId",
};

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
  await prisma.reward.updateMany({
    where: {
      id: {
        in: finalProgramRewards.map((reward) => reward.rewardId),
      },
    },
    data: {
      default: true,
    },
  });

  for (const reward of finalProgramRewards) {
    const rewardEvent = reward.rewardEvent;

    await prisma.programEnrollment.updateMany({
      where: {
        programId: reward.programId,
      },
      data: {
        [EVENT_TYPE_TO_COLUMN[rewardEvent]]: reward.rewardId,
      },
    });
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

    await prisma.programEnrollment.update({
      where: {
        id: reward.programEnrollmentId,
      },
      data: {
        [EVENT_TYPE_TO_COLUMN[rewardEvent]]: reward.rewardId,
      },
    });
  }
}

main();
