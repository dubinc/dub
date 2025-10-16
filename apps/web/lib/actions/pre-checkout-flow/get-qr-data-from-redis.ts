"use server";

import { redis } from "@/lib/upstash";
import { ERedisArg } from "core/interfaces/redis.interface.ts";
import z from "../../zod";

// schema for qr data that we expect to get from redis
const qrDataSchema = z.object({
  title: z.string(),
  styles: z.object({}).passthrough(),
  frameOptions: z.object({
    id: z.string(),
    color: z.string().optional(),
    textColor: z.string().optional(),
    text: z.string().optional(),
  }),
  qrType: z.enum([
    "website",
    "pdf",
    "image",
    "video",
    "whatsapp",
    "social",
    "wifi",
    "app",
    "feedback",
  ]),
  fileId: z.string().optional(),
});

// get qr data from redis by sessionId
export async function getQrDataFromRedis(sessionId: string) {
  try {
    const key = `${ERedisArg.QR_DATA_REG}:${sessionId}`;

    const data = await redis.get(key);

    if (!data) {
      return { success: true, qrData: null };
    }

    return { success: true, qrData: data };
  } catch (error) {
    console.error("Error getting QR data from redis:", error);
    return { success: false, qrData: null };
  }
}
