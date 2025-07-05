"use server";

import { cookies } from "next/headers";
import z from "../zod";
import { actionClient } from "./safe-action";

const schema = z.object({
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
    file: z.string().nullish(),
    fileName: z.string().nullish(),
    fileSize: z.number().nullish(),
  }),
});

export const saveQrDataToCookieAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { qrData } = parsedInput;

    try {
      // Сохраняем обработанные QR данные в куки
      cookies().set("processed-qr-data", JSON.stringify(qrData), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60, // 1 час
        path: "/",
      });

      return { success: true };
    } catch (error) {
      console.error("Error saving QR data to cookie:", error);
      throw new Error("Failed to save QR data");
    }
  });
