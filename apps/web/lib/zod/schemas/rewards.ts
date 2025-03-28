import { CommissionType, EventType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema, maxDurationSchema } from "./misc";

export const COMMISSION_TYPES = [
  {
    value: "one-off",
    label: "One-off",
    description: "Pay a one-time payout",
  },
  {
    value: "recurring",
    label: "Recurring",
    description: "Pay an ongoing payout",
  },
] as const;

export const LIMIT_RESET_OPTIONS = [
  { label: "Lifetime", value: "" },
  { label: "1 year", value: "12" },
  { label: "6 months", value: "6" },
  { label: "3 months", value: "3" },
  { label: "1 month", value: "1" },
] as const;

const payoutResetIntervalSchema = z
  .coerce
  .number()
  .nullish()
  .default(null)
  .refine((val) => val === null || LIMIT_RESET_OPTIONS.some((o) => o.value === val.toString()), {
    message: "Invalid payout reset interval",
  });

export const RewardSchema = z.object({
  id: z.string(),
  event: z.nativeEnum(EventType),
  name: z.string().nullish(),
  description: z.string().nullish(),
  type: z.nativeEnum(CommissionType),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  partnersCount: z.number().nullish(),
  maxTotalPayout: z.number().nullish(),
  payoutResetInterval: payoutResetIntervalSchema,
});

export const createOrUpdateRewardSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType).default("flat"),
  amount: z.number().min(0),
  maxDuration: maxDurationSchema,
  partnerIds: z.array(z.string()).nullish(),
  maxTotalPayout: z.number().nullish(),
  payoutResetInterval: payoutResetIntervalSchema,
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
  })
  .merge(
    z.object({
      rewardId: z.string(),
    }),
  );

export const rewardPartnersQuerySchema = z
  .object({
    rewardId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );
