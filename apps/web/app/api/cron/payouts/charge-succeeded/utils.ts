import { Partner, Payout, Program } from "@dub/prisma/client";
import { z } from "zod";

export const payloadSchema = z.object({
  chargeId: z.string(),
  invoiceId: z.string(),
  receiptUrl: z.string(),
  achCreditTransfer: z.boolean(),
});

export type Payouts = Payout & {
  partner: Partner;
  program: Program;
};

export type Payload = z.infer<typeof payloadSchema>;
