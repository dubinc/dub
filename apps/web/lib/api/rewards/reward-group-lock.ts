import { redis } from "@/lib/upstash";
import { EventType } from "@dub/prisma/client";

const REWARD_GROUP_LOCK_PREFIX = "reward:process:lock";

export async function assertRewardGroupLockAvailable({
  groupId,
  event,
}: {
  groupId: string;
  event: EventType;
}) {
  const holder = await redis.get<string>(
    `${REWARD_GROUP_LOCK_PREFIX}:${groupId}:${event}`,
  );

  if (holder) {
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
  const lockKey = `reward:process:lock:${groupId}:${event}`;

  if (mode === "new") {
    const holder = await redis.get<string>(lockKey);

    if (holder) {
      return false;
    }

    const acquired = await redis.set(lockKey, operationId, {
      nx: true,
      ex: 60 * 60, // 1 hour
    });

    return !!acquired;
  }

  if (mode === "continuation") {
    const holder = await redis.get<string>(lockKey);

    if (holder !== operationId) {
      return false;
    }

    return true;
  }
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
  const lockKey = `${REWARD_GROUP_LOCK_PREFIX}:${groupId}:${event}`;
  const holder = await redis.get<string>(lockKey);

  if (holder === operationId) {
    await redis.del(lockKey);
  }
}
