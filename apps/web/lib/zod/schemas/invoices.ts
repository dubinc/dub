import z from "@/lib/zod";
import { InvoiceStatus } from "@dub/prisma/client";

export const InvoiceSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  createdAt: z.date(),
  description: z.string().default("Dub payout"),
  pdfUrl: z.string().nullable(),
});
