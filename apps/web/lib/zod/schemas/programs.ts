import { CommissionInterval, CommissionType } from "@prisma/client";
import { z } from "zod";

export const createProgramSchema = z.object({
  name: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  minimumPayout: z.number(),
  recurringCommission: z.boolean(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  recurringDuration: z.number().nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
});
