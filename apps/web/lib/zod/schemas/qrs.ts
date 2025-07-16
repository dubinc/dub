import z from "@/lib/zod";
import { createLinkBodySchema } from "./links";

export const createQrBodySchema = z.object({
  data: z.string().describe("The data(content) of the qr"),
  qrType: z.enum([
    "website",
    "whatsapp",
    "social",
    "wifi",
    "app",
    "pdf",
    "image",
    "video",
    "feedback",
    "email",
  ]),
  title: z.string().optional(),
  description: z.string().max(280).optional(),
  styles: z.record(z.any()).optional(), // Json
  frameOptions: z.record(z.any()).optional(), // Json
  archived: z.boolean().optional(),
  fileId: z.string().optional().describe("The file the link leads to"),
  link: createLinkBodySchema,
});

export const updateQrBodySchema = createQrBodySchema.partial();
