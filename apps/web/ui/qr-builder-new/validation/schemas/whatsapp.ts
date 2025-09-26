import { z } from "zod";
import { qrNameSchema, phoneNumberSchema } from "./base";

export const whatsappQRSchema = qrNameSchema.extend({
  number: phoneNumberSchema,
  message: z.string()
    .max(160, "Message must be less than 160 characters")
    .optional()
    .or(z.literal("")),
});

export type WhatsappQRFormData = z.infer<typeof whatsappQRSchema>;