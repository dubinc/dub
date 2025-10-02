import { z } from "zod";

export const qrNameSchema = z.object({
  qrName: z
    .string()
    .min(1, "QR name is required")
    .max(100, "QR name must be less than 100 characters"),
});

export const websiteUrlSchema = z
  .string()
  .min(1, "Website URL is required")
  .url("Please enter a valid website URL");

export const phoneNumberSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number");

export const fileSchema = z.object({
  size: z.number().max(50 * 1024 * 1024, "File size must be less than 50MB"),
  name: z.string().min(1, "File name is required"),
  type: z.string().min(1, "File type is required"),
});

export const wifiPasswordSchema = z
  .string()
  .min(8, "WiFi password must be at least 8 characters")
  .optional()
  .or(z.literal(""));

export const wifiNetworkNameSchema = z
  .string()
  .min(1, "Network name is required")
  .max(32, "Network name must be less than 32 characters");
