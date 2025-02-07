import { PartnerReward, Reward } from "@dub/prisma/client";

export const transformReward = (
  reward: Reward & { partners: PartnerReward[] },
) => {
  return {
    ...reward,
    partners: reward.partners
  };
};
