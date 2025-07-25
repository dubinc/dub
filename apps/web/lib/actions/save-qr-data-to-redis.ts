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

export const saveQrDataToRedisAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { sessionId, qrData } = parsedInput;
    try {
      await redis.set(
        `${ERedisArg.QR_DATA_REG}:${sessionId}`,
        JSON.stringify(qrData),
        {
          ex: 60 * 10, // 10 minutes
        },
      );

      const cachedRedis = await redis.get(
        `${ERedisArg.QR_DATA_REG}:${sessionId}`,
      );
      console.log(
        "saveQrDataToRedisAction redis key:",
        `${ERedisArg.QR_DATA_REG}:${sessionId}`,
      );
      console.log("saveQrDataToRedisAction cachedRedis:", cachedRedis);
    } catch (error) {
      console.error("Error saving QR data to redis:", error);
      throw new Error("Failed to save QR data");
    }
  });
