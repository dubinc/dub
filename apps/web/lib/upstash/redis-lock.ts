import { redis } from "./redis";

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Runs `fn` while holding a Redis NX lock. Returns `null` if the lock
 * could not be acquired (another holder is active).
 * Stores a unique token and releases via compare-and-delete so an expired
 * lock acquired by another runner is never deleted by this run.
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
  const token = crypto.randomUUID();
  const acquired = await redis.set(key, token, {
    nx: true,
    ex: ttlSeconds,
  });

  if (!acquired) {
    return null;
  }

  try {
    return await fn();
  } finally {
    // Lua compare-and-delete: only the token owner may release the lock.
    await redis.eval(RELEASE_LOCK_SCRIPT, [key], [token]);
  }
}
