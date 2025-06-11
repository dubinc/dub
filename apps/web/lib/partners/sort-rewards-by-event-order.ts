import { Reward } from "@prisma/client";

const REWARD_EVENT_ORDER = ["click", "lead", "sale"] as const;

export function sortRewardsByEventOrder<T extends Pick<Reward, "event">>(
  rewards: T[],
): T[] {
  const sortedRewards = [...rewards];

  const eventOrderMap = new Map(
    REWARD_EVENT_ORDER.map((event, index) => [event, index]),
  );

  sortedRewards.sort((a, b) => {
    const aIndex = eventOrderMap.get(a.event) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = eventOrderMap.get(b.event) ?? Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });

  return sortedRewards;
}
