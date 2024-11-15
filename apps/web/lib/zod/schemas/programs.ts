import { intervals } from "@/lib/analytics/constants";
import { CommissionInterval, CommissionType } from "@prisma/client";
import { z } from "zod";
import { parseDateSchema } from "./utils";

export const createProgramSchema = z.object({
  name: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  recurringCommission: z.boolean(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  recurringDuration: z.number().nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
  cookieLength: z.number().min(1).max(180),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z.enum(intervals).default("30d"),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});
