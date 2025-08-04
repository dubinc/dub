"use server";

import { redis } from "@/lib/upstash";
import { ERedisArg } from "core/interfaces/redis.interface.ts";
import z from "../zod";
import { actionClient } from "./safe-action";

const schema = z.object({
  sessionId: z.string(),
  qrData: z.object({
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
  }),
});

// Background function to save data to Redis without blocking
async function saveToRedisBackground(sessionId: string, qrData: any) {
  try {
    await redis.set(
      `${ERedisArg.QR_DATA_REG}:${sessionId}`,
      JSON.stringify(qrData),
      {
        ex: 60 * 10, // 10 minutes
      },
    );
  } catch (error) {
    // Log error but don't throw since this runs in background
    console.error("Error saving QR data to redis in background:", error);
  }
}

export const saveQrDataToRedisAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { sessionId, qrData } = parsedInput;
    
    // Fire and forget - start Redis operation in background
    saveToRedisBackground(sessionId, qrData);
    
    // Return immediately without waiting for Redis operation
    return { success: true };
  });
