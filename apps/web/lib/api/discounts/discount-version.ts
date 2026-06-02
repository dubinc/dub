import { redis } from "@/lib/upstash";

const DISCOUNT_VERSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export function getDiscountVersionKey({ groupId }: { groupId: string }) {
  return `discount-version:${groupId}`;
}

export async function incrementDiscountVersion({
  groupId,
}: {
  groupId: string;
}) {
  const key = getDiscountVersionKey({ groupId });

  const version = await redis.incr(key);
  await redis.expire(key, DISCOUNT_VERSION_TTL_SECONDS);
  return version;
}

export async function isStaleDiscountVersion({
  version,
  groupId,
}: {
  version: number;
  groupId: string;
}) {
  const key = getDiscountVersionKey({ groupId });

  const currentVersion = await redis.get(key);

  return currentVersion != null && version < Number(currentVersion);
}
