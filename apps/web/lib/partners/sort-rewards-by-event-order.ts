import { Reward } from "@prisma/client";

const REWARD_EVENT_ORDER = ["click", "lead", "sale"] as const;

const eventOrderMap = new Map(
  REWARD_EVENT_ORDER.map((event, index) => [event, index]),
);

export function sortRewardsByEventOrder<T extends Pick<Reward, "event">>(
  rewards: T[],
): T[] {
  const sortedRewards = [...rewards];

  sortedRewards.sort((a, b) => {
    const aIndex = eventOrderMap.get(a.event) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = eventOrderMap.get(b.event) ?? Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });

  return sortedRewards;
}
