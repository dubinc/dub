"use server";

import { cookies } from "next/headers";
import { ECookieArg } from "../../core/interfaces/cookie.interface.ts";
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
    fileId: z.string().optional(),
  }),
});

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const saveQrDataToCookieAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { qrData } = parsedInput;

    const cookieStore = cookies();

    try {
      if (qrData) {
        console.log("saveQrDataToCookieAction QR data:", qrData);
      }
      
      cookieStore.set(ECookieArg.PROCESSED_QR_DATA, JSON.stringify(qrData), {
        httpOnly: true,
        secure: VERCEL_DEPLOYMENT,
        sameSite: "lax",
        maxAge: 60 * 10, // 10 минут - достаточно для OAuth флоу
        path: "/",
        domain: VERCEL_DEPLOYMENT ? `.getqr.com` : undefined,
      });


      const savedCookie = cookieStore.get(ECookieArg.PROCESSED_QR_DATA)?.value;
      if (savedCookie) {
        console.log("saveQrDataToCookieAction QR saved to cookies successfully:", qrData);
        return { success: true };
      } else {
        console.error("saveQrDataToCookieAction Failed to save QR data to cookie");
        throw new Error("Cookie not saved");
      }

    } catch (error) {
      console.error("Error saving QR data to cookie:", error);
      throw new Error("Failed to save QR data");
    }
  });
