import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_";

  const rewards = await prisma.reward.findMany({
    where: {
      programId,
    },
    include: {
      partners: {
        include: {
          programEnrollment: true,
        },
      },
    },
  });

  if (rewards.length === 0) {
    console.log(`No rewards found for program ${programId}.`);
    return;
  }

  const partnerSpecificRewards = rewards.filter(
    (reward) => reward.partners.length > 0,
  );

  const programWideRewards = rewards.filter(
    (reward) => reward.partners.length === 0,
  );

  // First update the commissions for partner specific rewards
  if (partnerSpecificRewards.length > 0) {
    const rewardsWithPartners = partnerSpecificRewards.map((reward) => ({
      event: reward.event,
      type: reward.type,
      amount: reward.amount,
      maxDuration: reward.maxDuration,
      partnerIds: reward.partners.map(
        ({ programEnrollment }) => programEnrollment.partnerId,
      ),
    }));

    console.table(rewardsWithPartners);

    for (const reward of rewardsWithPartners) {
      await prisma.commission.updateMany({
        where: {
          earnings: {
            gt: 0,
          },
          programId,
          partnerId: {
            in: reward.partnerIds,
          },
          type: reward.event,
        },
        data: {
          rewardType: reward.type,
          rewardAmount: reward.amount,
          rewardMaxDuration: reward.maxDuration,
        },
      });
    }
  }

  // then update all remaining commissions with program-wide rewards
  if (programWideRewards.length > 0) {
    const rewardsWithPartners = programWideRewards.map((reward) => ({
      event: reward.event,
      type: reward.type,
      amount: reward.amount,
      maxDuration: reward.maxDuration,
    }));

    console.table(rewardsWithPartners);

    for (const reward of rewardsWithPartners) {
      await prisma.commission.updateMany({
        where: {
          earnings: {
            gt: 0,
          },
          programId,
          type: reward.event,
        },
        data: {
          rewardType: reward.type,
          rewardAmount: reward.amount,
          rewardMaxDuration: reward.maxDuration,
        },
      });
    }
  }
}

main();
