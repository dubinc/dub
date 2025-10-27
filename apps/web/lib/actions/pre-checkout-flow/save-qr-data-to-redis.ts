"use server";

import { redis } from "@/lib/upstash";
import { ERedisArg } from "core/interfaces/redis.interface.ts";
import z from "../../zod";
import { actionClient } from "../safe-action";

// schema for qr data
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

// save qr data to redis in background
export const saveQrDataToRedisAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { sessionId, qrData } = parsedInput;

    const key = `${ERedisArg.QR_DATA_REG}:${sessionId}`;
    console.log("saveQrDataToRedisAction key", key);

    await redis
      .set(key, JSON.stringify(qrData), {
        ex: 60 * 60 * 24 * 10, // 10 days
      })
      .catch((error) => {
        console.error("Error saving QR data to redis in background:", error);
      });

    return { success: true };
  });
