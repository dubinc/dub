import { CommissionInterval, CommissionType, EventType } from "@prisma/client";
import { z } from "zod";

export const rewardSchema = z.object({
  id: z.string(),
  programId: z.string(),
  name: z.string().nullable(),
  type: z.nativeEnum(EventType),
  rewardType: z.nativeEnum(CommissionType),
  amount: z.number(),
  duration: z.number().nullable(),
  interval: z.nativeEnum(CommissionInterval).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createRewardSchema = z.object({
  name: z.string().max(190).nullish(),
  type: z.nativeEnum(EventType),
  rewardType: z.nativeEnum(CommissionType).default(CommissionType.percentage),
  amount: z.number().int().min(0),
  duration: z.number().int().positive().nullish(),
  interval: z.nativeEnum(CommissionInterval).nullish(),
  partnerIds: z.array(z.string()).nullish(),
  isDefault: z.boolean().default(false),
});
