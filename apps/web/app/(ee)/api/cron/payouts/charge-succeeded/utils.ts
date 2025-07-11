import { z } from "zod";

export const payloadSchema = z.object({
  chargeId: z.string(),
  invoiceId: z.string(),
  achCreditTransfer: z.boolean(),
});

export type Payload = z.infer<typeof payloadSchema>;
