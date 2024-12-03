import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { PayoutType } from "@prisma/client";
import { z } from "zod";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string({ required_error: "Please select a partner" }),
  start: parseDateSchema.nullable(),
  end: parseDateSchema.nullable(),
  type: z.nativeEnum(PayoutType),
  amount: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().default(0),
  ),
  description: z.string().max(5000).nullable(),
});
