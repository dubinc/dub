import { Reward } from "@prisma/client";

/**
 * Gets the top rewards for a program in order (click, lead, sale)
 */
export function reorderTopProgramRewards(rewards: Reward[]) {
  return ["click", "lead", "sale"]
    .map((event) => rewards.find((reward) => reward.event === event))
    .filter((reward) => reward !== undefined) as Reward[];
}
