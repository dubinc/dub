import { CommissionType, ProgramType } from "@prisma/client";
import { z } from "zod";

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  type: z.nativeEnum(ProgramType),
  cookieLength: z.number(),
  minimumPayout: z.number(),
  commissionAmount: z.number(),
  commissionType: z.nativeEnum(CommissionType),
  recurringCommission: z.boolean(),
  recurringDuration: z.number(),
  isLifetimeRecurring: z.boolean(),
});

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