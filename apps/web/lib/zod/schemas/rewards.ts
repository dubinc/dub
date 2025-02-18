import { CommissionType, EventType } from "@dub/prisma/client";
import { z } from "zod";

export const RECURRING_MAX_DURATIONS = [0, 3, 6, 12, 18, 24];

export const rewardSchema = z.object({
  id: z.string(),
  programId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  partnersCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createOrUpdateRewardSchema = z.object({
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType).default("flat"),
  amount: z.number().int().min(0),
  maxDuration: z.coerce
    .number()
    .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
      message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
    })
    .nullish(),
  partnerIds: z.array(z.string()).nullish(),
});

export const createRewardSchema = createOrUpdateRewardSchema.superRefine(
  (data) => {
    if (data.event !== EventType.sale) {
      data.maxDuration = 0;
      data.type = "flat";
    }
  },
);

export const updateRewardSchema = createOrUpdateRewardSchema
  .omit({
    event: true,
    isDefault: true,
  })
  .partial();
