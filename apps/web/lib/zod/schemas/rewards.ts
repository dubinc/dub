import { CommissionType, EventType } from "@dub/prisma/client";
import { z } from "zod";

export const RECURRING_MAX_DURATIONS = [
  "0",
  "3",
  "6",
  "12",
  "18",
  "24",
] as const;

export const rewardSchema = z.object({
  id: z.string(),
  programId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createOrUpdateRewardSchema = z.object({
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType).default("flat"),
  amount: z.number().int().min(0),
  maxDuration: z.enum(RECURRING_MAX_DURATIONS).nullish(),
  partnerIds: z.array(z.string()).nullish(),
});

export const createRewardSchema = createOrUpdateRewardSchema.superRefine(
  (data, ctx) => {
    if (data.event !== EventType.sale) {
      if (data.maxDuration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duration is only allowed for sale rewards.",
          path: ["maxDuration"],
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
