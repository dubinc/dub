import { CommissionInterval, CommissionType, EventType } from "@prisma/client";
import { z } from "zod";

export const rewardSchema = z.object({
  id: z.string(),
  programId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType),
  amount: z.number(),
  duration: z.number().nullable(),
  interval: z.nativeEnum(CommissionInterval).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createOrUpdateRewardSchema = z.object({
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType).default("flat"),
  amount: z.number().int().min(0),
  duration: z.number().int().positive().nullish(),
  interval: z.nativeEnum(CommissionInterval).nullish(),
  partnerIds: z.array(z.string()).nullish(),
  isDefault: z.boolean().default(false),
});

export const createRewardSchema = createOrUpdateRewardSchema.superRefine(
  (data, ctx) => {
    if (data.event !== EventType.sale) {
      if (data.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duration is only allowed for sale rewards.",
          path: ["duration"],
        });
      }

      if (data.interval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Interval is only allowed for sale rewards.",
        });
      }

      if (data.type !== "flat") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Type must be flat for ${data.event} rewards.`,
        });
      }
    }
  },
);

export const updateRewardSchema = createOrUpdateRewardSchema
  .omit({
    event: true,
    isDefault: true,
  })
  .partial();
