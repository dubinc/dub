import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { PayoutType } from "@prisma/client";
import { z } from "zod";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string({ required_error: "Please select a partner" }),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
  amount: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().default(0),
  ),
  type: z.nativeEnum(PayoutType),
  description: z
    .string()
    .max(190, "Description must be less than 190 characters")
    .nullable(),
});
