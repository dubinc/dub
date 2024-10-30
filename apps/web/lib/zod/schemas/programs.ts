import { CommissionType, ProgramType } from "@prisma/client";
import { z } from "zod";

export const createProgramSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(ProgramType),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  recurringCommission: z.boolean(),
  minimumPayout: z.number(),
  recurringDuration: z.number(),
  isLifetimeRecurring: z.boolean(),
});
