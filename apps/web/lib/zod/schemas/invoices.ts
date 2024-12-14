import z from "@/lib/zod";

export const InvoiceSchema = z.object({
  id: z.string(),
  total: z.number(),
  createdAt: z.date(),
  description: z.string().default("Dub payout"),
  pdfUrl: z.string().nullable(),
});
