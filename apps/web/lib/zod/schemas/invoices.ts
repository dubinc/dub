import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import * as z from "zod/v4";

export const StripeInvoiceStatusSchema = z.enum([
  "draft",
  "open",
  "paid",
  "uncollectible",
  "void",
]);

export const InvoiceSchema = z.object({
  id: z.string(),
  total: z.number(),
  status: z.enum(InvoiceStatus).optional(),
  stripeStatus: StripeInvoiceStatusSchema.optional(),
  paymentMethod: z.enum(PaymentMethod).nullable().optional(),
  createdAt: z.date(),
  description: z.string().default("Dub payout"),
  pdfUrl: z.string().nullable(),
  failedReason: z.string().nullish().default(null),
});
