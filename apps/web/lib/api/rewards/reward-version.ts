import { redis } from "@/lib/upstash";
import { EventType } from "@prisma/client";

const REWARD_VERSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export function getRewardVersionKey({
  groupId,
  event,
}: {
  groupId: string;
  event: EventType; // Reward type
}) {
  return `reward-version:${groupId}:${event}`;
}

export async function incrementRewardVersion({
  groupId,
  event,
}: {
  groupId: string;
  event: EventType;
}) {
  const key = getRewardVersionKey({
    groupId,
    event,
  });

  const version = await redis.incr(key);
  await redis.expire(key, REWARD_VERSION_TTL_SECONDS);
  return version;
}

export async function isStaleRewardVersion({
  version,
  groupId,
  event,
}: {
  version: number;
  groupId: string;
  event: EventType;
}) {
  const key = getRewardVersionKey({
    groupId,
    event,
  });

  const currentVersion = await redis.get(key);

  return currentVersion != null && version < Number(currentVersion);
}
