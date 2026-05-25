import { redis } from "@/lib/upstash";
import { EventType } from "@dub/prisma/client";

const REWARD_GROUP_LOCK_PREFIX = "reward:process:lock";
const REWARD_GROUP_LOCK_TTL_SECONDS = 60 * 60; // 1 hour

function getRewardGroupLockKey(groupId: string, event: EventType) {
  return `${REWARD_GROUP_LOCK_PREFIX}:${groupId}:${event}`;
}

export async function reserveRewardGroupLock({
  groupId,
  event,
  operationId,
}: {
  groupId: string;
  event: EventType;
  operationId: string;
}) {
  const acquired = await redis.set(
    getRewardGroupLockKey(groupId, event),
    operationId,
    {
      nx: true,
      ex: REWARD_GROUP_LOCK_TTL_SECONDS,
    },
  );

  if (!acquired) {
    throw new Error(
      `This group is being updated while ${event} reward changes are applied. Please wait a few minutes and try again.`,
    );
  }
}

export async function acquireRewardGroupLock({
  groupId,
  event,
  operationId,
  mode,
}: {
  groupId: string;
  event: EventType;
  operationId: string;
  mode: "new" | "continuation";
}) {
  const lockKey = getRewardGroupLockKey(groupId, event);

  if (mode === "continuation") {
    const holder = await redis.get<string>(lockKey);

    if (holder !== operationId) {
      return false;
    }

    await redis.expire(lockKey, REWARD_GROUP_LOCK_TTL_SECONDS);
    return true;
  }

  const acquired = await redis.set(lockKey, operationId, {
    nx: true,
    ex: REWARD_GROUP_LOCK_TTL_SECONDS,
  });

  return !!acquired;
}

export async function releaseRewardGroupLock({
  groupId,
  event,
  operationId,
}: {
  groupId: string;
  event: EventType;
  operationId: string;
}) {
  const lockKey = getRewardGroupLockKey(groupId, event);
  const holder = await redis.get<string>(lockKey);

  if (holder === operationId) {
    await redis.del(lockKey);
  }
}
