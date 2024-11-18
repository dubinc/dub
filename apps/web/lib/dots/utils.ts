import { redis } from "@/lib/upstash";

// TODO: Move this to a shared library
export const createIdempotencyKey = async () => {
  const key = crypto.randomUUID();

  const ok = await redis.set(`dots:idempotency:${key}`, 1, {
    ex: 24 * 60 * 60, // In Dots API, idempotency keys have a 24-hour timeout.
    nx: true,
  });

  if (!ok) {
    throw new Error("Duplicate idempotency key. Please try again.");
  }

  return key;
};
