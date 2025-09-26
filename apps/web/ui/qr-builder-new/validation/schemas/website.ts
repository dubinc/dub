import { z } from "zod";
import { qrNameSchema, websiteUrlSchema } from "./base";

export const websiteQRSchema = qrNameSchema.extend({
  websiteLink: websiteUrlSchema,
});

export type WebsiteQRFormData = z.infer<typeof websiteQRSchema>;