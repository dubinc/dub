import { Reward } from "@prisma/client";

// TODO:
// Need some cleanup here

/**
 * Gets the top rewards for a program in order (click, lead, sale)
 */
export function reorderTopProgramRewards(rewards: Reward[]) {
  return ["click", "lead", "sale"]
    .map((event) => rewards.find((reward) => reward.event === event))
    .filter((reward) => reward !== undefined) as Reward[];
}

export function sortRewardsByEvent<
  T extends Pick<Reward, "event" | "type" | "amount" | "maxDuration">,
>(rewards: T[]) {
  return ["sale", "lead", "click"]
    .map((event) => rewards.find((reward) => reward.event === event))
    .filter((reward) => reward !== undefined) as T[];
}
