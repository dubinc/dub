"use server";

import { redis } from "@/lib/upstash";
import { ERedisArg } from "core/interfaces/redis.interface.ts";

// remove qr data from redis by sessionId
export async function removeQrDataFromRedis(sessionId: string, extraKey?: string) {
  try {
    const key = `${ERedisArg.QR_DATA_REG}:${sessionId}${extraKey ? `:${extraKey}` : ""}`;

    await redis.del(key);

    return { success: true };
  } catch (error) {
    console.error("Error removing QR data from redis:", error);
    return { success: false };
  }
}
