import { redis } from "@/lib/upstash";

export const initRedis = async () => {
  await redis.get("test");
};
