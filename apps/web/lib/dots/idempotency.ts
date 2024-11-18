import { redis } from "@/lib/upstash";

export const createIdempotencyKey = async (id: string) => {
  const idempotencyKey = crypto.randomUUID();

  const oldValue = await redis.set(id, idempotencyKey, {
    ex: 24 * 60 * 60, // In Dots API, idempotency keys have a 24-hour timeout.
    nx: true,
    get: true,
  });

  return oldValue || idempotencyKey;
};
