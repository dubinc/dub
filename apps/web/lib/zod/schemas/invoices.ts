import { InvoiceStatus, PaymentMethod } from "@dub/prisma/client";
import z from "zod";

export const InvoiceSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
  createdAt: z.date(),
  description: z.string().default("Dub payout"),
  pdfUrl: z.string().nullable(),
  failedReason: z.string().nullish().default(null),
});
