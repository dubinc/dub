import { redis } from "./redis";

/**
 * Runs `fn` while holding a Redis NX lock. Returns `null` if the lock
 * could not be acquired (another holder is active). Always releases the
 * lock in `finally` when acquired.
 */
export async function withRedisLock<T>({
  key,
  ttlSeconds,
  fn,
}: {
  key: string;
  ttlSeconds: number;
  fn: () => Promise<T>;
}): Promise<T | null> {
  const acquired = await redis.set(key, "1", {
    nx: true,
    ex: ttlSeconds,
  });

  if (!acquired) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await redis.del(key);
  }
}
