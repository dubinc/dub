import { CommissionType, ProgramType } from "@prisma/client";
import { z } from "zod";

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().optional(),
  type: z.nativeEnum(ProgramType),
  cookieLength: z.number(),
  minimumPayout: z.number(),
  commissionAmount: z.number(),
  commissionType: z.nativeEnum(CommissionType),
  recurringCommission: z.boolean(),
});

export const createProgramSchema = z.object({
  name: z.string(),
  slug: z.string(),
});
