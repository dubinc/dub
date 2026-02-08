import { EventType, Reward } from "@dub/prisma/client";

const DEFAULT_REWARD_EVENT_ORDER = [
  EventType.click,
  EventType.lead,
  EventType.sale,
] as const;

export function sortRewardsByEventOrder<T extends Pick<Reward, "event">>(
  rewards: T[],
  customEventOrder?: (typeof DEFAULT_REWARD_EVENT_ORDER)[number][],
): T[] {
  const finalEventOrder = (customEventOrder ??
    DEFAULT_REWARD_EVENT_ORDER) as EventType[];

  const eventOrderMap = new Map(
    finalEventOrder.map((event, index) => [event, index]),
  );

  const sortedRewards = [...rewards];

  sortedRewards.sort((a, b) => {
    const aIndex = eventOrderMap.get(a.event) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = eventOrderMap.get(b.event) ?? Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });

  return sortedRewards;
}
