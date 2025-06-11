import { Reward } from "@prisma/client";

const REWARD_EVENT_ORDER = ["sale", "lead", "click"] as const;

type RewardEventOrder = (typeof REWARD_EVENT_ORDER)[number];

export function sortRewardsByEventOrder<T extends Pick<Reward, "event">>(
  rewards: T[],
  direction: "asc" | "desc" = "asc",
): T[] {
  const orderedEvents =
    direction === "asc"
      ? REWARD_EVENT_ORDER
      : [...REWARD_EVENT_ORDER].reverse();

  return orderedEvents
    .map((event: RewardEventOrder) =>
      rewards.find((reward) => reward.event === event),
    )
    .filter((reward): reward is T => reward !== undefined);
}
